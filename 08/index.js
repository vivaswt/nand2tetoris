'use strict';
const fs = require('fs');
const path = require('path');
const { exit } = require('process');
const { Transform } = require('stream');

class LineSplitter extends Transform {
    constructor(options) {
        const _options = options || {};
        _options.readableObjectMode = true;
        super(_options);
        this.rest = '';
    }

    _transform(chunk, encoding, callback) {
        const chunkstr = this.rest + chunk.toString();
        const lines = chunkstr.split('\r\n');
        for (let i = 0; i < lines.length - 1; i++) {
            this.push(lines[i]);
        }
        this.rest = lines[lines.length - 1];
        callback();
    }

    _final(callback) {
        this.push(this.rest);
        callback();
    }
}

class Parser extends Transform {
    constructor(options) {
        const _options = options || {};
        _options.readableObjectMode = true;
        _options.writableObjectMode = true;
        super(_options);
    }

    eraseComment(chunk) {
        let pos = chunk.indexOf('//');
        if (pos > -1) {
            return chunk.substr(0, pos);
        } else {
            return chunk;
        }
    }

    parseAsCommand(chunk) {
        const words = chunk.split(/\s/).filter(w => w.length > 0);
        if (words.length === 0 || words.length > 3) return null;

        const result = {
            type: '?',
            arg1: '',
            arg2: ''
        };

        switch (words[0]) {
            case 'add':
            case 'sub':
            case 'neg':
            case 'eq':
            case 'gt':
            case 'lt':
            case 'and':
            case 'or':
            case 'not':
                result.type = 'ARITHMETIC';
                result.arg1 = words[0];
                break;

            case 'push':
                result.type = 'PUSH';
                result.arg1 = words[1];
                result.arg2 = parseInt(words[2]);
                break;

            case 'pop':
                result.type = 'POP';
                result.arg1 = words[1];
                result.arg2 = parseInt(words[2]);
                break;

            case 'label':
                result.type = 'LABEL';
                result.arg1 = words[1];
                break;

            case 'goto':
                result.type = 'GOTO';
                result.arg1 = words[1];
                break;

            case 'if-goto':
                result.type = 'IF';
                result.arg1 = words[1];
                break;

            case 'call':
                result.type = 'CALL';
                result.arg1 = words[1];
                result.arg2 = parseInt(words[2]);
                break;

            case 'function':
                result.type = 'FUNCTION';
                result.arg1 = words[1];
                result.arg2 = parseInt(words[2]);
                break;

            case 'return':
                result.type = 'RETURN';
                break;

            default:
                break;
        }
        return result;
    }

    _transform(chunk, encoding, callback) {
        const line = this.eraseComment(chunk);
        const result = this.parseAsCommand(line);
        if (result) {
            result.text = chunk;
            this.push(result);
        }
        callback();
    }

    // undefinedなら空文字にする
    unstr(value) {
        return typeof value === 'undefined' ? '' : value;
    }
}

class Translator extends Transform {
    static #segMap1 = new Map();    // For local, argument, this, that
    static #segMap2 = new Map();    // For pointer, temp

    constructor(inFileName, options) {
        const _options = options || {};
        _options.readableObjectMode = true;
        _options.writableObjectMode = true;
        super(_options);

        this.inFileName = inFileName;
        this.inFileBaseName = path.basename(inFileName, '.vm');
        this.labelNumber = 1;
    }

    static segMap1() {
        if (this.#segMap1.size === 0) {
            this.#segMap1.set('local', 'LCL');
            this.#segMap1.set('argument', 'ARG');
            this.#segMap1.set('this', 'THIS');
            this.#segMap1.set('that', 'THAT');
        }
        return this.#segMap1;
    }

    static segMap2() {
        if (this.#segMap2.size === 0) {
            this.#segMap2.set('pointer', '3');
            this.#segMap2.set('temp', '5');
        }
        return this.#segMap2;
    }

    translatePUSH(command) {
        const result = [];

        if (command.arg1 === 'constant') {
            result.push(`// ** push constant ${command.arg2} **`);
            result.push(`@${command.arg2}`);
            result.push(`D=A`);
            result.push(`@SP`);
            result.push(`A=M`);
            result.push(`M=D`);
            result.push(`@SP`);
            result.push(`M=M+1`);
        }

        if (Translator.segMap1().has(command.arg1)) {
            result.push(`// ** push ${command.arg1} ${command.arg2} **`);
            result.push(`@${Translator.segMap1().get(command.arg1)}`);
            result.push(`D=M`);
            result.push(`@${command.arg2}`);
            result.push(`A=D+A`);
            result.push(`D=M`);

            // ここからDの値をスタックに積む
            result.push(`@SP`);
            result.push(`A=M`);
            result.push(`M=D`);
            result.push(`@SP`);
            result.push(`M=M+1`);
        }

        if (Translator.segMap2().has(command.arg1)) {
            const address =
                parseInt(Translator.segMap2().get(command.arg1))
                + parseInt(command.arg2);

            result.push(`// ** push ${command.arg1} ${command.arg2} **`);
            result.push(`@${address}`);
            result.push(`D=M`);

            // ここからDの値をスタックに積む
            result.push(`@SP`);
            result.push(`A=M`);
            result.push(`M=D`);
            result.push(`@SP`);
            result.push(`M=M+1`);
        }

        if (command.arg1 === 'static') {
            result.push(`// ** push ${command.arg1} ${command.arg2} **`);
            // D←M[変数名]
            result.push(`@${this.inFileBaseName}.${command.arg2}`);
            result.push(`D=M`);
            // M[SP]←D
            result.push(`@SP`);
            result.push(`A=M`);
            result.push(`M=D`);
            // SP←SP+1
            result.push(`@SP`);
            result.push(`M=M+1`);
        }

        return result;
    }

    translatePOP(command) {
        const result = [];

        if (Translator.segMap1().has(command.arg1)) {
            const segBaseName = Translator.segMap1().get(command.arg1);

            result.push(`// ** pop ${command.arg1} ${command.arg2} **`);
            // SP←SP-1
            result.push(`@SP`);
            result.push(`M=M-1`);
            // base←base+α
            result.push(`@${command.arg2}`);
            result.push(`D=A`);
            result.push(`@${segBaseName}`);
            result.push(`M=D+M`);
            // D←M[SP]
            result.push(`@SP`);
            result.push(`A=M`);
            result.push(`D=M`);
            // M[base]←D
            result.push(`@${segBaseName}`);
            result.push(`A=M`);
            result.push(`M=D`);
            //base←base-α
            result.push(`@${command.arg2}`);
            result.push(`D=A`);
            result.push(`@${segBaseName}`);
            result.push(`M=M-D`);
        }

        if (Translator.segMap2().has(command.arg1)) {
            const address =
                parseInt(Translator.segMap2().get(command.arg1))
                + parseInt(command.arg2);

            result.push(`// ** pop ${command.arg1} ${command.arg2} **`);
            // SP←SP-1
            result.push(`@SP`);
            result.push(`M=M-1`);
            // D←M[SP]
            result.push(`A=M`);
            result.push(`D=M`);
            // M[address]←D
            result.push(`@${address}`);
            result.push(`M=D`);
        }

        if (command.arg1 === 'static') {
            result.push(`// ** pop ${command.arg1} ${command.arg2} **`);
            // SP←SP-1
            result.push(`@SP`);
            result.push(`M=M-1`);
            // D←M[SP]
            result.push(`A=M`);
            result.push(`D=M`);
            // M[変数名]←D
            result.push(`@${this.inFileBaseName}.${command.arg2}`);
            result.push(`M=D`);
        }

        return result;
    }

    translateArithmetic(command) {
        switch (command.arg1) {
            case 'add':
            case 'sub':
            case 'and':
            case 'or':
                return this.translateBinaryOperation(command);
            case 'neg':
            case 'not':
                return this.translateUnaryOperation(command);
            case 'eq':
            case 'gt':
            case 'lt':
                return this.translateComparisonOperation(command);
            default:
                break;
        }
    }

    translateBinaryOperation(command) {
        const result = [];
        result.push(`// ** ${command.arg1} **`);

        result.push(`@SP`);
        result.push(`M=M-1`)
        result.push(`A=M`);
        result.push(`D=M`);
        result.push(`@SP`);
        result.push(`M=M-1`)
        result.push(`A=M`);
        switch (command.arg1) {
            case 'add':
                result.push(`M=M+D`);
                break;
            case 'sub':
                result.push(`M=M-D`);
                break;
            case 'and':
                result.push(`M=M&D`);
                break;
            case 'or':
                result.push(`M=M|D`);
                break;
            default:
                break;
        }

        result.push(`@SP`);
        result.push(`M=M+1`);
        return result;
    }

    translateUnaryOperation(command) {
        const result = [];
        result.push(`// ** ${command.arg1} **`);
        result.push(`@SP`);
        result.push(`A=M`);
        result.push(`A=A-1`);
        switch (command.arg1) {
            case 'neg':
                result.push(`M=-M`);
                break;
            case 'not':
                result.push(`M=!M`);
            default:
                break;
        }
        return result;
    }

    translateComparisonOperation(command) {
        const result = [];

        result.push(`// ** ${command.arg1} **`);
        result.push(`// @SP = @SP - 1`);
        result.push(`@SP`);
        result.push(`M=M-1`)

        result.push(`// D = *@SP`);
        result.push(`A=M`);
        result.push(`D=M`);

        result.push(`// @SP = @SP - 1`);
        result.push(`@SP`);
        result.push(`M=M-1`);

        result.push(`// A = *@SP`);
        result.push(`A=M`);

        result.push(`// substract 2 values`);
        result.push(`D=M-D`);
        result.push(`@COMP${this.labelNumber++}`);
        switch (command.arg1) {
            case 'eq':
                result.push(`D;JEQ`);
                break;
            case 'gt':
                result.push(`D;JGT`);
                break;
            case 'lt':
                result.push(`D;JLT`);
                break;
            default:
                break;
        }

        result.push(`// case : condition is not true`);
        result.push(`@SP`);
        result.push(`A=M`);
        result.push(`M=0`);
        result.push(`@COMP${this.labelNumber++}`);
        result.push(`0;JMP`);

        result.push(`// case : condition is true`);
        result.push(`(COMP${this.labelNumber - 2})`);
        result.push(`D=-1`);
        result.push(`@SP`);
        result.push(`A=M`);
        result.push(`M=D`);

        result.push(`// @SP++`);
        result.push(`(COMP${this.labelNumber - 1})`);
        result.push(`@SP`);
        result.push(`M=M+1`);

        return result;
    }

    translateLabel(command) {
        const result = [];
        result.push(`// ** ${command.type} ${command.arg1} **`);
        result.push(`(${command.arg1})`);
        return result;
    }

    translateGoto(command) {
        const result = [];
        result.push(`// ** ${command.type} ${command.arg1} **`);
        result.push(`@${command.arg1}`);
        result.push(`0;JMP`);
        return result;
    }

    translateIf(command) {
        const result = [];
        result.push(`// ** ${command.type} ${command.arg1} **`);
        // SP←SP-1
        result.push(`@SP`);
        result.push(`M=M-1`);
        // D←M[SP]
        result.push(`A=M`);
        result.push(`D=M`);
        // if D≠0 GOTO (LABEL)
        result.push(`@${command.arg1}`);
        result.push(`D;JNE`);
        return result;
    }

    translateFunction(command) {
        const result = [];
        result.push(`// ** ${command.type} ${command.arg1} ${command.arg2} **`);
        result.push(`(${command.arg1})`);
        for (let i = 0; i < command.arg2; i++) {
            result.push(`push constant 0`);
        }
        return result;
    }

    translateCall(command) {
        const result = [];

        const pushRegister = registerName => {
            result.push(`// * push ${registerName} *`);

            // D←@registerName
            result.push(`@${registerName}`);
            result.push(`D=M`);
            // M[SP]←D
            result.push(`@SP`);
            result.push(`A=M`);
            result.push(`M=D`);
            // SP++
            result.push(`@SP`);
            result.push(`M=M+1`);
        };

        const returnAddress = `$ret.${command.arg1}`;
        result.push(`// ** ${command.type} ${command.arg1} ${command.arg2} **`);

        result.push(`// * push return-address *`);
        // D←return-address
        result.push(`@${returnAddress}`);
        result.push(`D=A`);
        // M[SP]←D
        result.push(`@SP`);
        result.push(`A=M`);
        result.push(`M=D`);
        // SP++
        result.push(`@SP`);
        result.push(`M=M+1`);

        pushRegister('LCL');
        pushRegister('ARG');
        pushRegister('THIS');
        pushRegister('THAT');

        result.push(`// * ARG = SP – n – 5 *`);
        // D←SP – n - 5
        result.push(`@SP`);
        result.push(`D=M`);
        result.push(`@${command.arg2 - 5}`);
        result.push(`D=D-A`);
        // ARG←D
        result.push(`@ARG`);
        result.push(`M=D`);

        result.push(`// * LCL=SP *`);
        result.push(`@SP`);
        result.push(`D=M`);
        result.push(`@LCL`);
        result.push(`M=D`);

        result.push(`// * goto f *`);
        result.push(`@${command.arg1}`);
        result.push(`0;JMP`);
        result.push(`(${returnAddress})`);

        return result;
    }

    translateReturn(command) {
        const result = [];

        result.push(`// ** return **`);

        result.push(`// * FRAME = LCL *`);
        // R13をFRAMEとする
        result.push(`@LCL`);
        result.push(`D=M`);
        result.push(`@R13`);
        result.push(`M=D`);

        result.push(`// * RET = *(FRAME – 5) *`);
        // R14をRETとする
        result.push(`@5`);
        result.push(`D=D-A`);
        result.push(`@R14`);
        result.push(`M=D`);

        result.push(`// * *ARG = POP() *`);
        // D←M[SP]
        result.push(`@SP`);
        result.push(`A=M`);
        result.push(`D=M`);
        // M[ARG]←D
        result.push(`@ARG`);
        result.push(`A=M`);
        result.push(`M=D`);

        result.push(`// * SP = ARG + 1 *`);
        result.push(`@ARG`);
        result.push(`D=M+1`);
        result.push(`@SP`);
        result.push(`M=D`);

        const restoreRegister = (name, diff) => {
            result.push(`// * ${name} = *(FRAME - ${diff}) *`);
            result.push(`@R13`);
            result.push(`D=M`);
            result.push(`@${diff}`);
            result.push(`A=D-A`);
            result.push(`D=M`);
            result.push(`@${name}`);
            result.push(`M=D`);
        };

        // TODO restoreRegisterを使って以下を実装
        result.push(`// * THAT = *(FRAME – 1) *`);
        result.push(`// * THIS = *(FRAME – 2) *`);
        result.push(`// * ARG = *(FRAME – 3) *`);
        result.push(`// * LCL = *(FRAME – 4) *`);
        result.push(`// * goto RET *`);
        return result;
    }

    pushResults(results) {
        results.forEach(result => {
            this.push(result);
        });
    }

    _transform(chunk, encoding, callback) {
        switch (chunk.type) {
            case 'PUSH':
                this.pushResults(this.translatePUSH(chunk));
                break;
            case 'POP':
                this.pushResults(this.translatePOP(chunk));
                break;
            case 'ARITHMETIC':
                this.pushResults(this.translateArithmetic(chunk));
                break;
            case 'LABEL':
                this.pushResults(this.translateLabel(chunk));
                break;
            case 'GOTO':
                this.pushResults(this.translateGoto(chunk));
                break;
            case 'IF':
                this.pushResults(this.translateIf(chunk));
                break;
            case 'CALL':
                this.pushResults(this.translateCall(chunk));
                break;
            case 'FUNCTION':
                this.pushResults(this.translateFunction(chunk));
                break;
            case 'RETURN':
                this.pushResults(this.translateReturn(chunk));
                break;
            default:
                break;
        }
        callback();
    }
}

class Formatter extends Transform {
    constructor(options) {
        const _options = options || {};
        _options.writableObjectMode = true;
        super(_options);
    }

    _transform(chunk, encoding, callback) {
        this.push(`${chunk}\r\n`);
        callback();
    }
}

function asmFileName(inputName) {
    const _inputName = path.resolve(inputName);
    let outputFileName = '';
    if (fs.statSync(_inputName).isDirectory()) {
        outputFileName = path.join(_inputName, path.basename(_inputName) + '.asm');
    } else {
        outputFileName = path.join(
            path.dirname(_inputName),
            path.basename(_inputName, '.vm') + '.asm');
    }
    return outputFileName;
}

function vmFiles(inputName) {
    if (fs.statSync(inputName).isDirectory()) {
        return fs.readdirSync(inputName, { withFileTypes: true })
            .filter(d => d.isFile() && path.extname(d.name) === '.vm')
            .map(d => d.name)
            .sort()
            .map(f => path.join(inputName, f));
    } else {
        return [inputName];
    }
}

function translateFile(inFileName, outStream) {
    return new Promise(resolve => {
        const stream = fs.createReadStream(inFileName);

        const formatter = new Formatter();
        formatter.on('finish', () => {
            stream.destroy();
            resolve();
        });
        stream
            .pipe(new LineSplitter())
            .pipe(new Parser())
            .pipe(new Translator(inFileName))
            .pipe(formatter)
            .pipe(out, { end: false });
    });
}

async function translateFiles(inFileNames, out) {
    for (const inFileName of inFileNames) {
        await translateFile(inFileName, out);
    }
    return true;
}

if (!fs.existsSync(process.argv[2])) {
    console.error('file does not exists.');
    exit(1);
}

const out = fs.createWriteStream(
    asmFileName(process.argv[2]));
const inFiles = vmFiles(process.argv[2]);

translateFiles(inFiles, out)
    .then(() => {
        out.end();
    }).catch(e => {
        console.error(e);
    });

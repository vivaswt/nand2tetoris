'use strict';
const fs = require('fs');
const path = require('path');
const {Transform} = require('stream');

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
        for(let i = 0; i < lines.length - 1; i++) {
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
    constructor(options) {
        const _options = options || {};
        _options.readableObjectMode = true;
        _options.writableObjectMode = true;
        super(_options);

        this.labelNumber = 1;
    }

    translatePUSH(command) {
        if (command.arg1 !== 'constant') [];
        const result = [];
        result.push(`// ** push constant ${command.arg2} **`);
        result.push(`@${command.arg2}`);
        result.push(`D=A`);
        result.push(`@SP`);
        result.push(`A=M`);
        result.push(`M=D`);
        result.push(`@SP`);
        result.push(`M=M+1`);
        return result;
    }

    translateArithmetic(command) {
        switch (command.arg1) {
            case 'add':
            case 'sub':
                return this.translateBinaryOperation(command);
            case 'neg':
                return this.translateNeg(command);
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
                result.push(`M=D+M`);
                break;
            case 'sub':
                result.push(`M=D-M`);
            default:
                break;
        }
        
        result.push(`@SP`);
        result.push(`M=M+1`);
        return result;
    }

    translateNeg(command) {
        const result = [];
        result.push(`// ** neg **`);
        result.push(`@SP`);
        result.push(`A=M`);
        result.push(`A=A-1`);
        result.push(`M=-M`);
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
            case 'ARITHMETIC':
                this.pushResults(this.translateArithmetic(chunk));
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

const stream = fs.createReadStream(process.argv[2]);
const out = fs.createWriteStream(
    path.basename(
        process.argv[2], 
        path.extname(process.argv[2])) + '.asm');

stream
    .pipe(new LineSplitter())
    .pipe(new Parser())
    .pipe(new Translator())
    .pipe(new Formatter())
    .pipe(out);
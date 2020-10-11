'use strict';
const fs = require('fs');
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
    }
}

class Parser extends Transform {
    constructor(options) {
        const _options = options || {};
        _options.readableObjectMode = true;
        _options.writableObjectMode = true;
        super(_options);
    }

    _transform(chunk, encoding, callback) {
        const result = {};

        result.type = '?';

        // A命令判定
        const aInstExp = /^\s*@((\d+)|([\w\$\.\:]+))\s*(\/\/.*)?$/;
        const aInstResult = aInstExp.exec(chunk);
        if (aInstResult !== null) {
            result.type = 'A';
            result.isSymbol = aInstResult[3] != null;
            result.symbol = aInstResult[3];
            result.value = aInstResult[2] == null ? 0 : parseInt(aInstResult[2]);
        }

        // ラベル判定
        const labelExp = /^\s*\(([\w\$\.\:]+)\)\s*(\/\/.*)?$/;
        const labelResult = labelExp.exec(chunk);
        if (labelResult !== null) {
            result.type = 'L';
            result.symbol = labelResult[1];
        }

        // C命令判定
        const cInstExp = /^\s*((A?M?D?)=)?([DAM]?[\+\-\!\&\|]?[AMD01])(;(J[A-Z]{2}))?\s*(\/\/.*)?$/;
        const cInstResult = cInstExp.exec(chunk);
        if (cInstResult !== null) {
            result.type = 'C';
            result.dest = this.unstr(cInstResult[2]);
            result.comp = this.unstr(cInstResult[3]);
            result.jump = this.unstr(cInstResult[5]);
        }

        // 空行・コメント行判定
        const commentExp = /^\s*(\/\/(.*))?$/;
        const commentResult = commentExp.exec(chunk);
        if (commentResult !== null) {
            result.type = 'M';
            result.comment = this.unstr(commentResult[2]);
        }

        result.text = chunk;

        if (result.type !== 'M') {
            this.push(result);
        }
        callback();
    }

    // undefinedなら空文字にする
    unstr(value) {
        return typeof value === 'undefined' ? '' : value;
    }
}

class Code extends Transform {
    constructor(options) {
        const _options = options || {};
        _options.readableObjectMode = true;
        _options.writableObjectMode = true;
        super(_options);
    }

    _transform(chunk, encoding, callback) {
        let code = '';
        switch (chunk.type) {
            case 'A':
                code = chunk.value.toString(2).padStart(16, '0');
                this.push(code);
                break;
            case 'C':
                code = '111' 
                    + this.comp(chunk.comp)
                    + this.dest(chunk.dest)
                    + this.jump(chunk.jump);
                this.push(code);
                break;
            case 'L':
                break;
            default:
        }
        callback();
    }

    dest(mnemonic) {
        let result = '';

        for (const target of 'ADM') {
            if (mnemonic.includes(target)) {
                result += '1';
            } else {
                result += '0';
            }
        }

        return result;
    }

    jump(mnemonic) {
        let result = '';

        switch (mnemonic) {
            case 'JGT':
                result = '001';
                break;
            case 'JEQ':
                result = '010';
                break;
            case 'JGE':
                result = '011';
                break;
            case 'JLT':
                result = '100';
                break;
            case 'JNE':
                result = '101';
                break;
            case 'JLE':
                result = '110';
                break;
            case 'JMP':
                result = '111';
                break;
            default:
                result = '000';
        }

        return result;
    }

    comp(mnemonic) {
        let result = '';

        switch (mnemonic) {
            case '0':
                result = '0101010';
                break;
            case '1':
                result = '0111111';
                break;
            case '-1':
                result = '0111010';
                break;
            case 'D':
                result = '0001100';
                break;
            case 'A':
                result = '0110000';
                break;
            case '!D':
                result = '0001101';
                break;
            case '!A':
                result = '0110001';
                break;
            case '-D':
                result = '0001111';
                break;
            case '-A':
                result = '0110011';
                break;
            case 'D+1':
                result = '0011111';
                break;
            case 'A+1':
                result = '0110111';
                break;
            case 'D-1':
                result = '0001110';
                break;
            case 'A-1':
                result = '0110010';
                break;
            case 'D+A':
                result = '0000010';
                break;
            case 'D-A':
                result = '0010011';
                break;
            case 'A-D':
                result = '0000111';
                break;
            case 'D&A':
                result = '0000000';
                break;
            case 'D|A':
                result = '0010101';
                break;
            case 'M':
                result = '1110000';
                break;
            case '!M':
                result = '1110001';
                break;
            case '-M':
                result = '1110011';
                break;
            case 'M+1':
                result = '1110111';
                break;
            case 'M-1':
                result = '1110010';
                break;
            case 'D+M':
                result = '1000010';
                break;
            case 'D-M':
                result = '1010011';
                break;
            case 'M-D':
                result = '1000111';
                break;
            case 'D&M':
                result = '1000000';
                break;
            case 'D|M':
                result = '1010101';
                break;
            default:

        }

        return result;
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

const stream = fs.createReadStream(process.argv[2], {highWaterMark: 10});

stream
    .pipe(new LineSplitter())
    .pipe(new Parser())
    .pipe(new Code())
    .pipe(new Formatter())
    .pipe(process.stdout);

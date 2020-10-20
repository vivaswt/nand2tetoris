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

    _transform(chunk, encoding, callback) {
        const result = {};

        result.type = '?';

        // 算術論理コマンド
        const acomExp = /^\s*(add|sub|neg|eq|gt|lt|and|or|not)\s*(\/\/.*)?$/;
        const acomResult = acomExp.exec(chunk);
        if (acomResult !== null) {
            result.type = 'ARITHMETIC';
            result.arg1 = acomResult[1];
        }

        // PUSHコマンド判定
        const pushExp = /^\s*push\s+(\w+)\s+(\w+)\s*(\/\/.*)?$/;
        const pushResult = pushExp.exec(chunk);
        if (pushResult !== null) {
            result.type = 'PUSH';
            result.arg1 = pushResult[1];
            result.arg2 = parseInt(pushResult[2]);
        }

        // POPコマンド判定
        const popExp = /^\s*pop\s+(\w+)\s+(\w+)\s*(\/\/.*)?$/;
        const popResult = popExp.exec(chunk);
        if (popResult !== null) {
            result.type = 'POP';
            result.arg1 = popResult[1];
            result.arg2 = parseInt(popResult[2]);
        }

        // 空行・コメント行判定
        const commentExp = /^\s*(\/\/(.*))?$/;
        const commentResult = commentExp.exec(chunk);
        if (commentResult !== null) {
            result.type = 'COMMENT';
            result.comment = this.unstr(commentResult[2]);
        }

        result.text = chunk;

        if (result.type !== 'COMMENT') {
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
    }

    _transform(chunk, encoding, callback) {
        let result = '';
        switch (chunk.type) {
            case 'ARITHMETIC':
                this.push(chunk.arg1);
                break;
            case 'PUSH':
                this.push(`push ${chunk.arg1} ${chunk.arg2}`)
                break;
            case 'POP':
                this.push(`pop ${chunk.arg1} ${chunk.arg2}`)
                break;
            default:
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
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
            this.push(lines[i] + '\r\n');
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
            console.debug(result);
        }

        result.text = chunk;

        this.push(result);
        callback();
    }
}

class OutTrans extends Transform {
    constructor(options) {
        const _options = options || {};
        _options.writableObjectMode = true;
        super(_options);
    }

    _transform(chunk, encoding, callback) {
        this.push(`${chunk.type}:${chunk.text}\r`);
        callback();
    }
}

const stream = fs.createReadStream(process.argv[2], {highWaterMark: 10});
const splitter = new LineSplitter();
const parser = new Parser();
stream.pipe(splitter).pipe(parser).pipe(new OutTrans()).pipe(process.stdout);


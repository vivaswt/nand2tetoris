'use strict';
const fs = require('fs');
const path = require('path');
const { Transform } = require('stream');

class LineSplitter extends Transform {
    constructor(options) {
        super(options);
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

class Formatter extends Transform {
    constructor(options) {
        super(options);
        this.lineNumber = -1;
    }

    _transform(chunk, encoding, callback) {
        if (chunk.toString().startsWith('//') || chunk.toString().startsWith('(')) {
            this.push(`${chunk}\r\n`);
        } else {
            this.push(`${++this.lineNumber}:${chunk}\r\n`);
        }
        callback();
    }
}

const stream = fs.createReadStream(process.argv[2]);
const out = fs.createWriteStream(process.argv[3]);

stream
    .pipe(new LineSplitter())
    .pipe(new Formatter)
    .pipe(out);

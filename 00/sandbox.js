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
        callback();
    }
}

const stream = fs.createReadStream('file.txt');
const splitter = new LineSplitter();

splitter.on('end', () => {
    console.log('end');
});
splitter.on('data', chunk => {
    console.log(chunk);
});

stream.pipe(splitter);
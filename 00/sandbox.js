'use strict';

const fs = require('fs');
const path = require('path');
const { exit } = require('process');
const { Transform } = require('stream');

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

function translateFile(inFileName, outStream) {
    return new Promise(resolve => {
        const stream = fs.createReadStream(inFileName);

        const formatter = new Formatter();
        formatter.on('finish', () => {
            stream.destroy();
            resolve();
        });
        stream
            .pipe(out, {end: false});
    });
}

async function translateFiles(inFileNames, out) {
    for (const inFileName of inFileNames) {
        await translateFile(inFileName, out);
    }
    return true;
}

const out = fs.createWriteStream('data.txt');

translateFiles(['input.txt'], out)
.then(() => {
    out.end();
}).catch(e => {
    console.error(e);
});

'use strict';

const program = require('commander');

program
    .option('-nb, --no-bootstrap', 'No boot strap code')
    .parse(process.argv);

console.log(program.opts());
console.log(program.args);

if (program.bootstrap) {
    console.log('specified no boot strap');
} else {
    console.log('not specified boot strap');
}

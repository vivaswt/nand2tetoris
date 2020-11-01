'use strict';

function testcall(value) {
    console.log(`begin ${value}`);
    return new Promise(resolve => {
        setTimeout(() => {
            console.log(`process ${value}`);
            resolve(value);
        }, 50);
    });
}

function testcall3(value) {
    console.log(`start ${value}`);
    return new Promise(resolve => {
        console.log(`process ${value}`);
        resolve(value);
    });
}

const call = [testcall(1), testcall(2), testcall(3)];

return;
console.log('start');
testcall(1).then(value => {
    return testcall(value + 1);
}).then(value => {
    return testcall(value + 1);
});

console.log('end');
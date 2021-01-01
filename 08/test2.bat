@echo off
echo *** test1 MyFunction ***
node index.js MyFunction
node ..\00\lineNumber.js MyFunction\Myfunction.asm MyFunction\MyFunction_line.asm
call ..\..\tools\CPUEmulator MyFunction\MyFunction.tst
echo *** test2 NestedCall ***
node index.js FunctionCalls\NestedCall
call ..\..\tools\CPUEmulator FunctionCalls\NestedCall\NestedCall.tst
echo *** test2 FibonacciElement ***
node index.js FunctionCalls\FibonacciElement
call ..\..\tools\CPUEmulator FunctionCalls\FibonacciElement\FibonacciElement.tst
echo *** test3 StaticsTest ***
node index.js FunctionCalls\StaticsTest
call ..\..\tools\CPUEmulator FunctionCalls\StaticsTest\StaticsTest.tst

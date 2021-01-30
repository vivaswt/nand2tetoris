@echo off
echo *** test1 BasicLoop ***
node index.js -nb ProgramFlow\BasicLoop
call ..\..\tools\CPUEmulator ProgramFlow\BasicLoop\BasicLoop.tst
echo *** test2 FibonacciSeries ***
node index.js -nb ProgramFlow\FibonacciSeries
call ..\..\tools\CPUEmulator ProgramFlow\FibonacciSeries\FibonacciSeries.tst
echo *** test3 SimpleFunction ***
node index.js -nb FunctionCalls\SimpleFunction
call ..\..\tools\CPUEmulator FunctionCalls\SimpleFunction\SimpleFunction.tst
echo *** test4 NestedCall ***
node index.js FunctionCalls\NestedCall
node ..\00\lineNumber.js FunctionCalls\NestedCall\NestedCall.asm FunctionCalls\NestedCall\NestedCall_line.asm
call ..\..\tools\CPUEmulator FunctionCalls\NestedCall\NestedCall.tst
echo *** test5 FibonacciElement ***
node index.js FunctionCalls\FibonacciElement
node ..\00\lineNumber.js FunctionCalls\FibonacciElement\FibonacciElement.asm FunctionCalls\FibonacciElement\FibonacciElement_line.asm
call ..\..\tools\CPUEmulator FunctionCalls\FibonacciElement\FibonacciElement.tst
echo *** test6 StaticTest ***
node index.js FunctionCalls\StaticsTest
call ..\..\tools\CPUEmulator FunctionCalls\StaticsTest\StaticsTest.tst
echo *** test7 MyFunction ***
node index.js MyFunction
node ..\00\lineNumber.js MyFunction\MyFunction.asm MyFunction\MyFunction_line.asm
call ..\..\tools\CPUEmulator MyFunction\MyFunction.tst
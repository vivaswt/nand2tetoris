@echo off
echo *** test1 BasicLoop ***
node index.js ProgramFlow\BasicLoop
call ..\..\tools\CPUEmulator ProgramFlow\BasicLoop\BasicLoop.tst
echo *** test2 FibonacciSeries ***
node index.js ProgramFlow\FibonacciSeries
call ..\..\tools\CPUEmulator ProgramFlow\FibonacciSeries\FibonacciSeries.tst
echo *** test3 SimpleFunction ***
node index.js FunctionCalls\SimpleFunction
call ..\..\tools\CPUEmulator FunctionCalls\SimpleFunction\SimpleFunction.tst
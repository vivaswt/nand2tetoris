@echo off
cd /d %~dp0
echo *** SimpleAdd ***
node index.js StackArithmetic\SimpleAdd\SimpleAdd.vm
call ..\..\tools\CPUEmulator StackArithmetic\SimpleAdd\SimpleAdd.tst
echo *** StackTest ***
node index.js StackArithmetic\StackTest
call ..\..\tools\CPUEmulator StackArithmetic\StackTest\StackTest.tst
echo *** BasicTest ***
node index.js MemoryAccess\BasicTest
call ..\..\tools\CPUEmulator MemoryAccess\BasicTest\BasicTest.tst
echo *** PointerTest ***
node index.js MemoryAccess\PointerTest
call ..\..\tools\CPUEmulator MemoryAccess\PointerTest\PointerTest.tst
echo *** StaticTest ***
node index.js MemoryAccess\StaticTest
call ..\..\tools\CPUEmulator MemoryAccess\StaticTest\StaticTest.tst

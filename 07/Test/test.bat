@echo off
cd /d %~dp0
echo *** test1 ***
node ..\index.js test1.vm
call ..\..\..\tools\CPUEmulator test1.tst
echo *** test2 ***
node ..\index.js test2.vm
call ..\..\..\tools\CPUEmulator test2.tst
echo *** test3 ***
node ..\index.js test3.vm
call ..\..\..\tools\CPUEmulator test3.tst
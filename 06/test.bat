@echo off

node index.js max\Max.asm > out.txt
fc out.txt max\Max.asm
if errorlevel 1 (
    exit 1
)

node index.js add\Add.asm > out.txt
fc out.txt add\Add.asm
if errorlevel 1 (
    exit 1
)

node index.js rect\Rect.asm > out.txt
fc out.txt rect\Rect.asm
if errorlevel 1 (
    exit 1
)

node index.js pong\Pong.asm > out.txt
fc out.txt pong\Pong.asm
if errorlevel 1 (
    exit 1
)
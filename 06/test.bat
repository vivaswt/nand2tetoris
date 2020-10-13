@echo off

node index.js add\Add.asm > out.txt
fc out.txt add\Compare.hack
if errorlevel 1 (
    exit 1
)

node index.js max\MaxL.asm > out.txt
fc out.txt max\CompareL.hack
if errorlevel 1 (
    exit 1
)

node index.js rect\RectL.asm > out.txt
fc out.txt rect\CompareL.hack
if errorlevel 1 (
    exit 1
)

node index.js pong\PongL.asm > out.txt
fc out.txt pong\CompareL.hack
if errorlevel 1 (
    exit 1
)

node index.js max\Max.asm > out.txt
fc out.txt max\Compare.hack
if errorlevel 1 (
    exit 1
)

node index.js rect\Rect.asm > out.txt
fc out.txt rect\Compare.hack
if errorlevel 1 (
    exit 1
)

node index.js pong\Pong.asm > out.txt
fc out.txt pong\Compare.hack
if errorlevel 1 (
    exit 1
)

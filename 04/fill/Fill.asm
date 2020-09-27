// This file is part of www.nand2tetris.org
// and the book "The Elements of Computing Systems"
// by Nisan and Schocken, MIT Press.
// File name: projects/04/Fill.asm

// Runs an infinite loop that listens to the keyboard input.
// When a key is pressed (any key), the program blackens the screen,
// i.e. writes "black" in every pixel;
// the screen should remain fully black as long as the key is pressed. 
// When no key is pressed, the program clears the screen, i.e. writes
// "white" in every pixel;
// the screen should remain fully clear as long as no key is pressed.

(LOOP)
    // if KBD > 0 then
    //   flag = -1
    //   goto DRAW
    // else
    //   flag = 0
    @KBD
    D=M
    @PRESSED
    D;JGT
    @flag
    M=0
    @DRAW
    0;JMP

(PRESSED)
    @flag
    M=-1

(DRAW)
    // At this time, flag is set as value to update screen.
    @i
    M=0

(DRAW_LOOP)
    // calcuate address in screen.
    // position = SCREEN + i
    @SCREEN
    D=M
    @i
    D=D+A
    @position
    M=D

    // update screen
    @flag
    D=M
    @position
    M=D

    // i = i + 1
    // if (i > 8192) goto LOOP
    @i
    M=M+1
    D=M
    @8192
    D=D-A
    @LOOP
    D;JGT

    @DRWA_LOOP
    0;JMP
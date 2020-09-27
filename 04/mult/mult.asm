// This file is part of www.nand2tetris.org
// and the book "The Elements of Computing Systems"
// by Nisan and Schocken, MIT Press.
// File name: projects/04/Mult.asm

// Multiplies R0 and R1 and stores the result in R2.
// (R0, R1, R2 refer to RAM[0], RAM[1], and RAM[2], respectively.)

    // counter = R1
    @R1
    D=M
    @counter
    M=D

    // R2 = 0
    @R2
    M=0

(LOOP)
    // counter = counter - 1
    // if (counter < 0) goto END
    @counter
    MD=M-1
    @END
    D;JLT

    // R2 = R2 + R0
    @R0
    D=M
    @R2
    M=D+M

    // goto LOOP
    @LOOP
    0;JMP

(END)

(INFINITE_LOOP)
    @INFINITE_LOOP
    0;JMP
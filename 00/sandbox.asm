@256
D=A
@SP
M=D
// ↓ここから

// ** push constant 53 **
@53
D=A
@SP
A=M
M=D
@SP
M=M+1
// ** neg **
@SP
A=M
A=A-1
M=-M
// ** push constant 28 **
@28
D=A
@SP
A=M
M=D
@SP
M=M+1
// ** not **
@SP
A=M
A=A-1
M=!M

// ↑ここまで
(LOOP)
@LOOP
0;JMP
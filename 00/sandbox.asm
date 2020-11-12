@256
D=A
@SP
M=D
// ↓ここから

// ** push constant 57 **
@57
D=A
@SP
A=M
M=D
@SP
M=M+1
// ** push constant 31 **
@31
D=A
@SP
A=M
M=D
@SP
M=M+1
// ** push constant 53 **
@53
D=A
@SP
A=M
M=D
@SP
M=M+1
// ** add **
@SP
M=M-1
A=M
D=M
@SP
M=M-1
A=M
M=D+M
@SP
M=M+1
// ** push constant 112 **
@112
D=A
@SP
A=M
M=D
@SP
M=M+1
// ** sub **
@SP
M=M-1
A=M
D=M
@SP
M=M-1
A=M
M=M-D
@SP
M=M+1
// ** neg **
@SP
A=M
A=A-1
M=-M
// ** and **
@SP
M=M-1
A=M
D=M
@SP
M=M-1
A=M
M=D&M
@SP
M=M+1
// ** push constant 82 **
@82
D=A
@SP
A=M
M=D
@SP
M=M+1
// ** or **
@SP
M=M-1
A=M
D=M
@SP
M=M-1
A=M
M=D|M
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
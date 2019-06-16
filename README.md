# Javascript Compiling Tokenizer

Hello, welcome to JavaScript tokenizer 

This project has the sole purpose of tokenizing JavaScript by traversing the files and generating an abstract syntax tree from the resulting tokenization process 

JCT does not worry about loading the files or what to do with the files after pushing them into an abstract syntax tree it simply concerns itself with the process of generating an AST

Other projects utilise this projects and take the resulting abstract syntax tree and transpire the JavaScript accordingly

For example require to ecma takes the abstract syntax tree generated from this code and uses it to transpile code that contains the Old require import system into the new es6 import system

## usage

```
    npm i javascript-compiling-tokenizer
```

Import it

```
    import 
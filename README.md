[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com) [![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0)



![JCT](./logo.png)
# Javascript Compiling Tokenizer
>Give your Javascript the token of love

Hello, welcome to JavaScript tokenizer

This project has the sole purpose of tokenizing JavaScript by traversing the files and generating an abstract syntax tree from the resulting tokenization process

JCT does not worry about loading the files or what to do with the files after pushing them into an abstract syntax tree it simply concerns itself with the process of generating an AST

Other projects utilise this projects and take the resulting abstract syntax tree and transpire the JavaScript accordingly

For example require to ecma takes the abstract syntax tree generated from this code and uses it to transpile code that contains the Old require import system into the new es6 import system

## usage

Install it

```
    npm i javascript-compiling-tokenizer
```

link it

```
    npm link
```

Import it

```
    import LexicalAnalyzer from 'javascript-compiling-tokenizer';
```

Initialize it

```
    const tokenizer = new LexicalAnalyzer(options)

    //options only have one property.... 'verbose' [boolean]
```

Run it
```
    const syntaxTree = tokenizer().start(fileAsString);
```

Test it
```
    npm test
```

options

```
{
    verbose: boolean //will log to console
    thirdPartyParsingTests: Array<(char: string, current: number, input: string) => IThirdPartyParsingResult> = [];
}
```

## Injecting your own third party lexical checks
Its as simple as providing an array of functions. The functions are given the following arguments: <br/><br/>
``` char:string, current:number, input:string ``` 

char is the string at the current position, current is the index of the current position in the input string and input is a stringified version of the whole file.

The function must return an object ```(IThirdPartyParsingResult)``` containing:

```
{
    payload: {type: 'coolnew type', value: 'the value'} //the token
    current: number //new cursor position after going through this function
}
```

Third party lexical checks are always performed first.

## Coming soon

documentation on the AST layout

The tokenizer will recurse in the following conditions:

- if it finds an opening parenthesis ```(```
- if it finds an opening code block ```{```
- if it finds an opening array ```[```
- if it finds a declaration ``` const, let, var new ```

The code generate will consist of:

```
TODO

```
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("underscore");
var colors = require("colors");
var CARRIAGE_RETURN = /\n/;
var EOL = /\r/;
var WHITESPACE = /\s/;
/**
 * Any char thats not a whitespace and not ;
 */
var ASSIGNABLE_CHARACTERS = /[^\s,^;]/;
var NUMBERS = /[0-9]/;
var DECLARABLE_CHARACTERS = /[A-Za-z_.$]/i;
var LexicalAnalyzer = /** @class */ (function () {
    function LexicalAnalyzer(options) {
        this.verbose = false;
        this.lineNumber = 0;
        this.assigner = false;
        this.thirdPartyParsingTests = [];
        if (_.isEmpty(options)) {
            throw new Error('No options have been provided');
        }
        if (options.verbose) {
            this.verbose = true;
        }
        if (options.thirdPartyParsingTests && options.thirdPartyParsingTests.length > 0) {
            this.thirdPartyParsingTests = this.thirdPartyParsingTests.concat([options.thirdPartyParsingTests]);
        }
    }
    LexicalAnalyzer.prototype.log = function (message) {
        if (this.verbose) {
            return console.log(message);
        }
    };
    LexicalAnalyzer.prototype.start = function (input, current, exitOn) {
        var _this = this;
        if (!input) {
            throw new Error('No Input string provided');
        }
        current = current || 0;
        var tokens = Array();
        var char = input[current];
        while (current < input.length) {
            char = input[current];
            if (char === exitOn) {
                this.log(colors.yellow("exiting " + exitOn));
                if (exitOn === "}" && input[current + 1] === ';') {
                    current = current++;
                }
                break;
            }
            if (!_.isEmpty(this.thirdPartyParsingTests)) {
                var thirdPartyTokens = Array();
                this.thirdPartyParsingTests.forEach(function (test) {
                    var result = test(char, current, input);
                    if (result && result.payload && (typeof result.payload.type === "string") && !_.isUndefined(result.payload.value)) {
                        if (!result.currentCursorPosition) {
                            throw new Error('Third party parsing function must return the new cursor position');
                        }
                        tokens.push(result.payload);
                        current = result.currentCursorPosition;
                    }
                    else {
                        _this.log('third party function returned no results, continuing');
                    }
                });
            }
            //paren
            if (char === '(') {
                this.log(colors.yellow("entering " + char));
                char = input[++current];
                var results = this.start(input, current, ')');
                tokens.push({ type: 'params', value: results.tokens });
                current = results.current;
                char = input[++current];
                continue;
            }
            //arr
            if (char === '[') {
                this.log(colors.yellow("entering " + char));
                char = input[++current];
                var results = this.start(input, current, ']');
                tokens.push({ type: 'array', value: results.tokens });
                current = results.current;
                char = input[++current];
                continue;
            }
            //body
            if (char === '{') {
                this.log(colors.yellow("entering " + char));
                char = input[++current];
                var results = this.start(input, current, '}');
                tokens.push({ type: 'codeblock', value: results.tokens });
                current = results.current;
                char = input[++current];
                continue;
            }
            var isNewLine = function (char) {
                var newLine = false;
                if (EOL.test(char)) {
                    _this.lineNumber = (_this.lineNumber + 1);
                    tokens.push({ type: 'eol', value: _this.lineNumber });
                    newLine = true;
                }
                if (CARRIAGE_RETURN.test(char)) {
                    _this.lineNumber = (_this.lineNumber + 1);
                    tokens.push({ type: 'carriagereturn', value: _this.lineNumber });
                    newLine = true;
                }
                return newLine;
            };
            //test for cr and lf
            if (isNewLine(char)) {
                current++;
                continue;
            }
            if (WHITESPACE.test(char)) {
                current++;
                continue;
            }
            if (NUMBERS.test(char)) {
                var value = '';
                while (NUMBERS.test(char)) {
                    value += char;
                    char = input[++current];
                }
                tokens.push({ type: 'number', value: value });
                continue;
            }
            var doubleQuotedString = this.maybeDoubleQuotedStringCheck(char, input, current);
            if (doubleQuotedString.type) {
                tokens.push(_.pick(doubleQuotedString, 'type', 'value'));
                current = doubleQuotedString.current;
                char = input[current];
                this.assigner = false;
                continue;
            }
            var singleQuotedString = this.maybeSingleQuotedStringCheck(char, input, current);
            if (singleQuotedString.type) {
                tokens.push(_.pick(singleQuotedString, 'type', 'value'));
                current = singleQuotedString.current;
                char = input[current];
                this.assigner = false;
                continue;
            }
            var backTickString = this.maybeBackTickStringCheck(char, input, current);
            if (backTickString.type) {
                tokens.push(_.pick(backTickString, 'type', 'value'));
                current = singleQuotedString.current;
                char = input[current];
                this.assigner = false;
                continue;
            }
            if (DECLARABLE_CHARACTERS.test(char)) {
                var value = '';
                while (DECLARABLE_CHARACTERS.test(char) && !_.isUndefined(char)) {
                    value += char;
                    char = input[++current];
                }
                this.log(colors.bgCyan(value));
                //check name for reserved
                switch (value) {
                    case "const":
                    case "var":
                    case "let":
                        {
                            this.log(colors.yellow("entering " + char));
                            var results = this.start(input, current, ';');
                            tokens.push({ type: value, value: results.tokens });
                            current = results.current;
                            char = input[++current];
                            break;
                        }
                    default:
                        {
                            tokens.push({ type: 'name', value: value });
                            break;
                        }
                }
                continue;
            }
            //check for assignment call
            if (char === "=") {
                tokens.push({ type: 'assigner', value: char });
                this.assigner = true;
                char = input[++current];
                continue;
            }
            //if we have an assignment flag, then push any non whiespace chars into a new token until we reach a whitespace
            if (this.assigner && ASSIGNABLE_CHARACTERS.test(char)) {
                var value = '';
                while (ASSIGNABLE_CHARACTERS.test(char) && !_.isUndefined(char)) {
                    value += char;
                    char = input[++current];
                }
                this.log(colors.bgCyan(value));
                tokens.push({ type: 'assignee', value: value });
                this.assigner = false;
                continue;
            }
            if (char === ',') {
                tokens.push({ type: 'seperator', value: char });
                char = input[++current];
                continue;
            }
            if (char === ';') {
                this.log(colors.yellow("end of line" + char));
                tokens.push({ type: 'statementSeperator', value: char });
                char = input[++current];
                continue;
            }
            //inline comment
            if (char === "/" && input[current + 1] == "/") {
                var value = '';
                while (!isNewLine(char)) {
                    value += char;
                    char = input[++current];
                }
                tokens.push({ type: 'inlinecomment', value: value });
                current++;
                continue;
            }
            //multi line comment, should be two astrix, but since ...some people... use /* instead of  /**, we catch both
            if (char === "/" && input[current + 1] === "*") {
                var value = '';
                var closing = "*/";
                var aheadText = '';
                char = input[current + 3];
                while (closing !== aheadText) {
                    value += char;
                    char = input[++current];
                    aheadText = char + input[current + 1];
                }
                tokens.push({ type: 'multilinecomment', value: value });
                //closing comment means we need to move the cursor two aheadText
                current = (current + 2);
                continue;
            }
            if (char === "=") {
                tokens.push({ type: 'assigner', value: char });
                this.assigner = true;
                continue;
            }
            //operators
            switch (char) {
                case "<":
                case ">":
                case "&":
                case "|":
                case "!":
                case "%":
                case "+":
                case "-":
                case "/":
                case "*":
                case ">":
                case ">":
                case "~":
                case "^":
                case "?":
                case ":":
                case ".":
                    {
                        tokens.push({ type: 'operator', value: char });
                        current++;
                        continue;
                    }
            }
            //finally, people end their code in different ways, we log ; because there's a chance its the last 'thing'
            this.log(colors.red("DEBUG current curser " + current + ", last cursor " + input.length + " current char " + char + ", recursive exit condition is " + exitOn));
            throw new TypeError('unknown var type: ' + char);
        }
        return { tokens: tokens, current: current };
    };
    LexicalAnalyzer.prototype.maybeBackTickStringCheck = function (char, input, current) {
        if (char === '`') {
            var value = '';
            char = input[++current];
            while (char !== '`') {
                value += char;
                char = input[++current];
            }
            //skip the closing quote
            char = input[++current];
            return { type: 'stringLiteral', value: value, current: current };
        }
        return { type: '', value: '' };
    };
    LexicalAnalyzer.prototype.maybeDoubleQuotedStringCheck = function (char, input, current) {
        // value inside  double quotes
        if (char === '"') {
            var value = '';
            char = input[++current];
            while (char !== '"') {
                value += char;
                char = input[++current];
            }
            //skip the closing quote
            char = input[++current];
            return { type: 'string', value: value, current: current };
        }
        return { type: '', value: '' };
    };
    LexicalAnalyzer.prototype.maybeSingleQuotedStringCheck = function (char, input, current) {
        // value inside  double quotes
        if (char === "'") {
            var value = '';
            char = input[++current];
            while (char !== "'") {
                value += char;
                char = input[++current];
            }
            //skip the closing quote
            char = input[++current];
            return { type: 'string', value: value, current: current };
        }
        return { type: '', value: '' };
    };
    return LexicalAnalyzer;
}());
exports.default = LexicalAnalyzer;
//# sourceMappingURL=index.js.map
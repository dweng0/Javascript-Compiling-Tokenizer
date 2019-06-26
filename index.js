"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("underscore");
var colors = require("colors");
var CARRIAGE_RETURN = /\n/;
var TAB = /\t/;
var EOL = /\r/;
var WHITESPACE = /\s/;
var ASTRIX = /[*]/;
/**
 * Any assignable character
 */
var ASSIGNABLE_CHARACTERS = /[^\s\n\t\r;(){}[\]=]/;
/**
 * Match all special characters except underscore and semicolon... and whitespace.. and tabs... and newlines
 */
var SPECIAL_CHARACTERS = /[^a-zA-Z0-9_;\s\n\t\r]/;
//Generate code from the lexer
var Generator = /** @class */ (function () {
    function Generator() {
    }
    Generator.prototype.start = function (tokens) {
        var _this = this;
        return tokens.reduce(function (content, token) {
            //check operator positioning
            switch (token.type) {
                case "assigner":
                case "seperator":
                case "operator":
                case "number":
                case "name":
                case "tab":
                case "eol":
                case "carriagereturn":
                case "string":
                case "stringLiteral":
                case "assignee":
                case "statementseperator":
                case "inlinecomment":
                case "multilinecomment":
                case "space":
                    {
                        return content += token.value;
                    }
                case "const":
                case "var":
                case "let":
                    {
                        return content += token.type + " " + _this.start(token.value);
                    }
                case "params":
                    {
                        return content += "(" + _this.start(token.value) + ")";
                    }
                case "array":
                    {
                        return content += "[" + _this.start(token.value) + "]";
                    }
                case "codeblock":
                    {
                        return content += "{" + _this.start(token.value) + "}";
                    }
                default:
                    {
                        throw new TypeError('Unable to parse unknown type' + token.type);
                    }
            }
        }, "");
    };
    return Generator;
}());
exports.Generator = Generator;
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
            this.log(colors.bgYellow("Checking: " + char));
            if (char === exitOn) {
                this.log(colors.yellow("exiting " + exitOn));
                //check for space after the exit condition
                if (exitOn === ';') {
                    tokens.push({ type: 'statementseperator', value: char });
                }
                if (exitOn === "}" && input[current + 1] === ';') {
                    current = current++;
                }
                break;
            }
            if (!_.isEmpty(this.thirdPartyParsingTests)) {
                this.log(colors.bgYellow("Enter thirdparty " + char));
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
                this.log(colors.bgYellow("Enter " + char));
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
                this.log(colors.bgYellow("Enter " + char));
                char = input[++current];
                var results = this.start(input, current, ']');
                tokens.push({ type: 'array', value: results.tokens });
                current = results.current;
                char = input[++current];
                continue;
            }
            //body
            if (char === '{') {
                this.log(colors.bgYellow("Enter " + char));
                char = input[++current];
                var results = this.start(input, current, '}');
                tokens.push({ type: 'codeblock', value: results.tokens });
                current = results.current;
                char = input[++current];
                continue;
            }
            var isNewLine = function (char) {
                _this.log(colors.bgYellow("Newline check " + char));
                var newLine = false;
                if (EOL.test(char)) {
                    _this.lineNumber = (_this.lineNumber + 1);
                    tokens.push({ type: 'eol', value: char });
                    newLine = true;
                }
                if (CARRIAGE_RETURN.test(char)) {
                    _this.lineNumber = (_this.lineNumber + 1);
                    tokens.push({ type: 'carriagereturn', value: char });
                    newLine = true;
                }
                _this.log(colors.bgYellow("Newline: " + newLine));
                return newLine;
            };
            //test for cr and lf
            if (isNewLine(char)) {
                current++;
                continue;
            }
            if (TAB.test(char)) {
                tokens.push({ type: 'tab', value: '\t' });
                current++;
                continue;
            }
            if (WHITESPACE.test(char)) {
                tokens.push({ type: 'space', value: ' ' });
                current++;
                continue;
            }
            var doubleQuotedString = this.stringConditional('"', char, input, current);
            if (doubleQuotedString.type) {
                tokens.push(_.pick(doubleQuotedString, 'type', 'value'));
                current = doubleQuotedString.current;
                char = input[current];
                this.assigner = false;
                continue;
            }
            var singleQuotedString = this.stringConditional("'", char, input, current);
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
                current = backTickString.current;
                char = input[current];
                this.assigner = false;
                continue;
            }
            //check for assignment call
            if (char === "=") {
                var newCurrent = (current + 1);
                var token = { type: 'assigner', value: char };
                var nextChar = input[current + 1];
                //if the next char is '=' then its an equality check
                if (nextChar === '=') {
                    newCurrent = (newCurrent + 1);
                    var equalityComparator = char + '=';
                    if (input[current + 2] === '=') {
                        equalityComparator += "=";
                        newCurrent = (newCurrent + 1);
                    }
                    token.type = 'operator';
                    token.value = equalityComparator;
                }
                else if (nextChar === '>') {
                    token.type = 'operator';
                    token.value = '=>';
                    newCurrent = (newCurrent + 1);
                }
                current = newCurrent;
                tokens.push(token);
                this.assigner = true;
                continue;
            }
            //if we have an assignment flag, then push any non whitespace chars into a new token until we reach a whitespace
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
                tokens.push({ type: 'statementseperator', value: char });
                char = input[++current];
                continue;
            }
            //inline comment
            if (char === "/" && input[current + 1] == "/") {
                var value = '';
                while (!isNewLine(char) && !_.isUndefined(char)) {
                    value += char;
                    char = input[++current];
                }
                tokens.push({ type: 'inlinecomment', value: value });
                continue;
            }
            //multi line comment, should be two astrix, but since ...some people... use /* instead of  /**, we catch both
            if (char === "/" && input[current + 1] === "*") {
                var value = '';
                var closing = "*/";
                var aheadText = '';
                //skip the astrix stuff
                current = (current + 1);
                char = input[current];
                while (ASTRIX.test(char)) {
                    char = input[++current];
                }
                //we got this far we no long have astrixesnow we do it until the look ahead
                while (closing !== aheadText) {
                    value += char;
                    char = input[++current];
                    aheadText = char + input[current + 1];
                }
                tokens.push({ type: 'multilinecomment', value: "/**" + value + closing });
                current = (current + 2);
                continue;
            }
            //check for operators
            if (SPECIAL_CHARACTERS.test(char)) {
                var value = '';
                var type = 'operator';
                while (SPECIAL_CHARACTERS.test(char) && !_.isUndefined(char)) {
                    value += char;
                    char = input[++current];
                }
                tokens.push({ type: type, value: value });
                continue;
            }
            //declarations must start with a alpha character, however, afterwards it can contain numbers (check the while decl)
            if (ASSIGNABLE_CHARACTERS.test(char)) {
                var value = '';
                while (ASSIGNABLE_CHARACTERS.test(char) && !_.isUndefined(char)) {
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
                            var type = (this.assigner) ? 'assignee' : 'name';
                            this.assigner = false;
                            tokens.push({ type: type, value: value });
                            break;
                        }
                }
                continue;
            }
            this.log(colors.red("DEBUG current curser " + current + ", last cursor " + input.length + " current char " + char + ", recursive exit condition is " + exitOn));
            throw new TypeError('unknown var type: ' + char);
        }
        return { tokens: tokens, current: current };
    };
    LexicalAnalyzer.prototype.maybeBackTickStringCheck = function (char, input, current) {
        var BACK_TICK = /`/;
        if (BACK_TICK.test(char)) {
            var value = "`";
            char = input[++current];
            while (!BACK_TICK.test(char)) {
                value += char;
                char = input[++current];
            }
            value += "`";
            char = input[++current];
            return { type: 'stringLiteral', value: value, current: current };
        }
        return { type: '', value: '' };
    };
    LexicalAnalyzer.prototype.stringConditional = function (condition, char, input, current) {
        // capture the quotes and the value inside  double/single quotes
        if (char === condition) {
            var value = condition;
            char = input[++current];
            while (char !== condition) {
                value += char;
                char = input[++current];
            }
            value += condition;
            char = input[++current];
            return { type: 'string', value: value, current: current };
        }
        return { type: '', value: '' };
    };
    return LexicalAnalyzer;
}());
exports.LexicalAnalyzer = LexicalAnalyzer;
//# sourceMappingURL=index.js.map
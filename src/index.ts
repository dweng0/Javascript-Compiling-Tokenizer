import * as _ from 'underscore';
import * as colors from 'colors';

const NEW_LINE = /[\r\n]/;
const WHITESPACE = /\s/;
const NUMBERS = /[0-9]/;
const DECLARABLE_CHARACTERS = /[A-Za-z_.$]/i;

export default class LexicalAnalyzer {
    verbose: boolean = false;
    log(message: string) {
        if (this.verbose) {
            return this.log(message);
        }
    }
    constructor(options) {
        if (options.verbose) {
            this.verbose = true;
        }
    }
    start(input, current, exitOn) {
        current = current || 0;
        let tokens = [];
        let char = input[current];

        while (current < input.length) {

            char = input[current];

            if (char === exitOn) {
                this.log(colors.yellow(`exiting ${exitOn}`));
                if (exitOn === "}" && input[current + 1] === ';') {
                    current = current++;
                }

                break;
            }
            //paren
            if (char === '(') {
                this.log(colors.yellow("entering " + char));
                char = input[++current];
                let results = this.start(input, current, ')');
                tokens.push({ type: 'params', value: results.tokens });
                current = results.current;
                char = input[++current];
                continue;
            }

            //arr
            if (char === '[') {
                this.log(colors.yellow("entering " + char));
                char = input[++current];
                let results = this.start(input, current, ']');
                tokens.push({ type: 'array', value: results.tokens });
                current = results.current;
                char = input[++current];
                continue;
            }

            //body
            if (char === '{') {
                this.log(colors.yellow("entering " + char));
                char = input[++current];
                let results = this.start(input, current, '}');
                tokens.push({ type: 'codeblock', value: results.tokens });
                current = results.current;
                char = input[++current];
                continue;
            }

            if (NEW_LINE.test(char)) {
                current++;
                continue;
            }


            if (WHITESPACE.test(char)) {
                current++;
                continue;
            }


            if (NUMBERS.test(char)) {
                let value = '';
                while (NUMBERS.test(char)) {
                    value += char;
                    char = input[++current];
                }
                tokens.push({ type: 'number', value });
                continue;
            }

            const doubleQuotedString = this.maybeDoubleQuotedStringCheck(
                char,
                input,
                current
            );
            if (!_.isEmpty(doubleQuotedString)) {
                tokens.push(_.pick(doubleQuotedString, 'type', 'value'));
                current = doubleQuotedString.current;
                char = input[current];
                continue;
            }

            const singleQuotedString = this.maybeSingleQuotedStringCheck(
                char,
                input,
                current
            );
            if (!_.isEmpty(singleQuotedString)) {
                tokens.push(_.pick(singleQuotedString, 'type', 'value'));
                current = singleQuotedString.current;
                char = input[current];
                continue;
            }

            if (DECLARABLE_CHARACTERS.test(char)) {
                let value = '';
                while (DECLARABLE_CHARACTERS.test(char)) {
                    value += char;
                    char = input[++current];
                }
                this.log(colors.bgCyan(value));

                //check name for reserved
                switch (value) {
                    case "const":
                    case "var":
                    case "let":
                    case "new":
                        {
                            this.log(colors.yellow("entering " + char));
                            const results = this.start(input, current, ';');
                            tokens.push({ type: 'declaration', value: results.tokens });
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

            if (char === ',') {
                tokens.push({ type: 'seperator', value: char });
                char = input[++current];
                continue;
            }
            if (char === ';') {
                this.log(colors.yellow("newline" + char));
                tokens.push({ type: 'newLine', value: char });
                char = input[++current];
                continue;
            }

            //inline comment
            if (char === "/" && input[current + 1] == "/") {
                let value = '';
                while (!NEW_LINE.test(char)) {
                    value += char;
                    char = input[++current];
                }
                tokens.push({ type: 'inlinecomment', value });
                current++;
                continue;
            }

            //multi line comment, should be two astrix, but since ...some people... use /* instead of  /**, we catch both
            if (char === "/" && input[current + 1] === "*") {
                let value = ''
                const closing = "*/";
                let aheadText = ''
                char = input[current + 3];
                while (closing !== aheadText) {
                    value += char;
                    char = input[++current];
                    aheadText = char + input[current + 1];
                }
                tokens.push({ type: 'multilinecomment', value });
                //closing comment means we need to move the cursor two aheadText
                current = (current + 2);
                continue;
            }

            //operators
            switch (char) {
                case "=":
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
            this.log(colors.red(`DEBUG current curser ${current}, last cursor ${input.length} current char ${char}, recursive exit condition is ${exitOn}`));
            throw new TypeError('unknown var type: ' + char);
        }
        return { tokens, current };
    }

    maybeDoubleQuotedStringCheck(char, input, current) {
        // value inside  double quotes
        if (char === '"') {
            let value = '';

            char = input[++current];
            while (char !== '"') {
                value += char;
                char = input[++current];
            }
            //skip the closing quote
            char = input[++current];
            return { type: 'string', value, current };
        }
        return {};
    }

    maybeSingleQuotedStringCheck(char, input, current) {
        // value inside  double quotes
        if (char === "'") {
            let value = '';

            char = input[++current];
            while (char !== "'") {
                value += char;
                char = input[++current];
            }
            //skip the closing quote
            char = input[++current];
            return { type: 'string', value, current };
        }
        return {};
    }
}

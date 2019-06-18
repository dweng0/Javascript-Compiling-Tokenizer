import * as _ from 'underscore';
import * as colors from 'colors';

const CARRIAGE_RETURN = /\n/;
const TAB = /\t/;
const EOL = /\r/;
const WHITESPACE = /\s/;

/**
 * Any char thats not a whitespace and not ;
 */
const ASSIGNABLE_CHARACTERS = /[^\s,^;]/;

const NUMBERS = /[0-9]/;

const DECLARABLE_CHARACTERS = /[A-Za-z_.$]/i;

interface IPayload {
    type: string,
    value: any
}

interface IThirdPartyParsingResult {
    payload: IPayload,
    currentCursorPosition: number
}

//Generate code from the lexer
export class Generator {
    start(tokens:Array<IPayload>): string {
        return tokens.reduce((content, token) => {
        switch(token.type)
        {
            case "operator":
            case "assigner":
            case "seperator":
            case "number":
            case "name":
            {
                return content += `${token.value} `;
            }
            case "tab":
            case "eol":
            case "carriagereturn":
            case "string":
            case "stringLiteral":
            case "assignee":
            case "statementseperator":
            {
                return content += token.value;
            }
            case "multilinecomment":
            {
                return content += `/** ${token.value} */`;
            }
            case "inlinecomment":
            {
                return content += '//' + token.value;
            }
            case "const":
            case "var":
            case "let":
            {
                return content += `${token.type} ${this.start(token.value)}`;
            }
            case "params":
            {
                return content += `(${this.start(token.value)})`;
            }
            case "array":
            {
                return content += `[${this.start(token.value)}]`;
            }
            case "codeblock":
            {
                return content += `{${this.start(token.value)}}`;
            }
        }
        },"");
    }
}

export class LexicalAnalyzer {
    verbose: boolean = false;
    lineNumber: number = 0;
    assigner: boolean = false;
    thirdPartyParsingTests: Array<(char: string, current: number, input: string) => IThirdPartyParsingResult> = [];

    log(message: string) {
        if (this.verbose) {
            return console.log(message);
        }
    }

    constructor(options) {
        if (_.isEmpty(options)) {
            throw new Error('No options have been provided');
        }

        if (options.verbose) {
            this.verbose = true;
        }

        if (options.thirdPartyParsingTests && options.thirdPartyParsingTests.length > 0) {
            this.thirdPartyParsingTests = [...this.thirdPartyParsingTests, options.thirdPartyParsingTests];
        }
    }

    start(input, current?, exitOn?) {
        if (!input) {
            throw new Error('No Input string provided');
        }

        current = current || 0;
        let tokens = Array<IPayload>();
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

            if (!_.isEmpty(this.thirdPartyParsingTests)) {
                this.thirdPartyParsingTests.forEach(test => {
                    let result = test(char, current, input);
                    if (result && result.payload && (typeof result.payload.type === "string") && !_.isUndefined(result.payload.value)) {
                        if (!result.currentCursorPosition) {
                            throw new Error('Third party parsing function must return the new cursor position');
                        }

                        tokens.push(result.payload);
                        current = result.currentCursorPosition;
                    }
                    else {
                        this.log('third party function returned no results, continuing');
                    }
                });
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

            const isNewLine = (char) => {
                let newLine = false;
                if (EOL.test(char)) {
                    this.lineNumber = (this.lineNumber + 1);
                    tokens.push({ type: 'eol', value: char});
                    newLine = true;
                }
                if(CARRIAGE_RETURN.test(char))
                {
                    this.lineNumber = (this.lineNumber + 1);
                    tokens.push({ type: 'carriagereturn', value: char });
                    newLine = true;
                }
                return newLine;
            }

            //test for cr and lf
            if(isNewLine(char))
            {
                current++;
                continue;
            }

            if(TAB.test(char)) {
                tokens.push({ type: 'tab', value: char});
                current++;
                continue;
            }

            if (WHITESPACE.test(char)) {
                current++;
                continue;
            }

            const doubleQuotedString = this.stringConditional(
                '"',
                char,
                input,
                current
            );
            if (doubleQuotedString.type) {
                tokens.push(_.pick(doubleQuotedString, 'type', 'value'));
                current = doubleQuotedString.current;
                char = input[current];
                this.assigner = false;
                continue;
            }

            const singleQuotedString = this.stringConditional(
                "'",
                char,
                input,
                current
            );
            if (singleQuotedString.type) {
                tokens.push(_.pick(singleQuotedString, 'type', 'value'));
                current = singleQuotedString.current;
                char = input[current];
                this.assigner = false;
                continue;
            }

            const backTickString = this.maybeBackTickStringCheck(
                char,
                input,
                current
            );
            if(backTickString.type)
            {
                tokens.push(_.pick(backTickString, 'type', 'value'));
                current = backTickString.current;
                char = input[current];
                this.assigner = false;
                continue;
            }

            //declarations must start with a alpha character, however, afterwards it can contain numbers (check the while decl)
            if (DECLARABLE_CHARACTERS.test(char)) {
                let value = '';
                while (DECLARABLE_CHARACTERS.test(char) && !_.isUndefined(char) || NUMBERS.test(char) && !_.isUndefined(char)) {
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
                            const results = this.start(input, current, ';');
                            tokens.push({ type: value, value: results.tokens });
                            current = results.current;
                            char = input[++current];
                            break;
                        }
                    default:
                        {
                            let type = (this.assigner) ? 'assignee' : 'name';
                            this.assigner = false;
                            tokens.push({ type, value });
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

            //if we have an assignment flag, then push any non whitespace chars into a new token until we reach a whitespace
            if (this.assigner && ASSIGNABLE_CHARACTERS.test(char)) {
                let value = '';
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
                let value = '';
                while (!isNewLine(char) && !_.isUndefined(char)) {
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

            if(char === "=")
            {
                tokens.push({type: 'assigner', value: char});
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

            this.log(colors.red(`DEBUG current curser ${current}, last cursor ${input.length} current char ${char}, recursive exit condition is ${exitOn}`));
            throw new TypeError('unknown var type: ' + char);
        }
        return { tokens, current };
    }
    maybeBackTickStringCheck(char: string, input: string, current: number) {
            const BACK_TICK = /`/
           if (BACK_TICK.test(char)) {
            let value = "`";
            char = input[++current];
            while (!BACK_TICK.test(char)) {
                value += char;
                char = input[++current];
            }
            value += "`";
            char = input[++current];
            return { type: 'stringLiteral', value, current };
        }
        return { type: '', value: '' }
    }
    stringConditional(condition, char, input, current) {

         // capture the quotes and the value inside  double/single quotes
        if (char === condition) {

            let value = condition;
            char = input[++current];
            while (char !== '"') {
                value += char;
                char = input[++current];
            }
            value += condition;

            char = input[++current];
            return { type: 'string', value, current };
        }
        return { type: '', value: '' }
    }
}

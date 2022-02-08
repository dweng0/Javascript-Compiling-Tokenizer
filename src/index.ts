
const CARRIAGE_RETURN = /\n/;
const TAB = /\t/;
const EOL = /\r/;
const WHITESPACE = /\s/;
const ASTRIX = /[*]/

const isEmpty = (arr: Array<any>) => arr ? (arr.length > 0) : true;

/**
 * Any assignable character
 */
const ASSIGNABLE_CHARACTERS = /[^\s\n\t\r,;(){}[\]=]/;

/**
 * Match all special characters except underscore and semicolon... and whitespace.. and tabs... and newlines
 */
const SPECIAL_CHARACTERS = /[^a-zA-Z0-9_;\s\n\t\r]/;

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
	start(tokens: Array<IPayload>): string {
		return tokens.reduce((content, token) => {
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
				case "space": {
						return content += token.value;
					}
				case "const":
				case "var":
				case "let":
				case "import":
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
				default:
					{
						throw new TypeError('Unable to parse unknown type' + token.type);
					}
			}
		}, "");
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
		if (!options) {
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
			this.log(`Checking: ${char}`);
			if (char === exitOn) {
				this.log(`exiting ${exitOn}`);
				//check for space after the exit condition
				if (exitOn === ';') {
					tokens.push({ type: 'statementseperator', value: char });
				}
				if (exitOn === "}" && input[current + 1] === ';') {
					current = current++;
				}
				break;
			}

			if (!isEmpty(this.thirdPartyParsingTests)) {
				this.log(`Enter thirdparty ${char}`);
				this.thirdPartyParsingTests.forEach(test => {
					let result = test(char, current, input);
					if (result && result.payload && (typeof result.payload.type === "string") && result.payload.value !== undefined) {
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
				this.log(`Enter ${char}`);
				this.log("entering " + char);
				char = input[++current];
				let results = this.start(input, current, ')');
				tokens.push({ type: 'params', value: results.tokens });
				current = results.current;
				char = input[++current];
				continue;
			}

			//arr
			if (char === '[') {
				this.log(`Enter ${char}`);
				char = input[++current];
				let results = this.start(input, current, ']');
				tokens.push({ type: 'array', value: results.tokens });
				current = results.current;
				char = input[++current];
				continue;
			}

			//body
			if (char === '{') {
				this.log(`Enter ${char}`);
				char = input[++current];
				let results = this.start(input, current, '}');
				tokens.push({ type: 'codeblock', value: results.tokens });
				current = results.current;
				char = input[++current];
				continue;
			}

			const isNewLine = (char) => {
				this.log(`Newline check ${char}`);
				let newLine = false;
				if (EOL.test(char)) {
					this.lineNumber = (this.lineNumber + 1);
					tokens.push({ type: 'eol', value: char });
					newLine = true;
				}
				if (CARRIAGE_RETURN.test(char)) {
					this.lineNumber = (this.lineNumber + 1);
					tokens.push({ type: 'carriagereturn', value: char });
					newLine = true;
				}
				this.log(`Newline: ${newLine}`);
				return newLine;
			}

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

			const doubleQuotedString = this.stringConditional(
				'"',
				char,
				input,
				current
			);
			if (doubleQuotedString.type) {
                const {type, value} = doubleQuotedString;
				tokens.push({type, value});
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
                const {type, value, current} = singleQuotedString;
				tokens.push({type, value});
				char = input[current];
				this.assigner = false;
				continue;
			}

			const backTickString = this.maybeBackTickStringCheck(
				char,
				input,
				current
			);
			if (backTickString.type) {
                const { type, value, current} = backTickString;
                tokens.push( { type, value});
				char = input[current];
				this.assigner = false;
				continue;
			}


			//check for assignment call
			if (char === "=") {
				let newCurrent = (current + 1)
				let token = { type: 'assigner', value: char };
				const nextChar = input[current + 1]
				//if the next char is '=' then its an equality check
				if (nextChar === '=') {
					newCurrent = (newCurrent + 1);
					let equalityComparator = char + '=';
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
				let value = '';
				while (ASSIGNABLE_CHARACTERS.test(char) && char !== undefined) {
					value += char;
					char = input[++current];
				}
				this.log(value);
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
				this.log("end of line" + char);
				tokens.push({ type: 'statementseperator', value: char });
				char = input[++current];
				continue;
			}

			//inline comment
			if (char === "/" && input[current + 1] == "/") {
				let value = '';
				while (!isNewLine(char) && char !== undefined) {
					value += char;
					char = input[++current];
				}
				tokens.push({ type: 'inlinecomment', value });
				continue;
			}

			//multi line comment, should be two astrix, but since ...some people... use /* instead of  /**, we catch both
			if (char === "/" && input[current + 1] === "*") {
				let value = '';
				const closing = "*/";
				let aheadText = ''

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
				let value = '';
				const type = 'operator';
				while (SPECIAL_CHARACTERS.test(char) && char !== undefined) {
					value += char;
					char = input[++current];
				}
				tokens.push({ type, value });
				continue;
			}
			//declarations must start with a alpha character, however, afterwards it can contain numbers (check the while decl)
			if (ASSIGNABLE_CHARACTERS.test(char)) {
				let value = '';
				while (ASSIGNABLE_CHARACTERS.test(char) && char !== undefined) {
					value += char;
					char = input[++current];
				}
				this.log(value);

				//check name for reserved
				switch (value) {
					case "const":
					case "var":
					case "let":
						{
							this.log("entering ");
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

			this.log(`DEBUG current curser ${current}, last cursor ${input.length} current char ${char}, recursive exit condition is ${exitOn}`);
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
			while (char !== condition) {
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

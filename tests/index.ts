import { LexicalAnalyzer, Generator} from '../src';
import { expect } from 'chai';
import 'mocha';

describe('Lexer tests', () => {
    const lexer = (opt) => { return new LexicalAnalyzer(opt);}

    it('should fail without options object passed in', () => {
        expect(lexer).to.throw();
    });

    it('should have verbose attribute set when provided', () => {
        const verboseLexxer = () => { return new LexicalAnalyzer({verbose: true})}
        expect(verboseLexxer().verbose).to.be.true;
        expect(lexer({verbose: false}).verbose).to.be.false;
    });

    it('Should throw if no input string is provided', () => {
        expect(lexer({verbose: true}).start).to.Throw();
    });

    it('Should have third party parser test as a member if provided as an option', () => {
        const lex = lexer({
            thirdPartyParsingTests: [(thing:string) => { return {type: 'a thing', value: 'another thing'}}]
        });
        expect(lex.thirdPartyParsingTests).to.be.an('Array');
    });

    it('Should throw if no input string is provided', () =>{
        const test = () =>{
            return lexer({verbose: true}).start('');
        }
        expect(test).to.throw();
    });

    it('Should return an object when succesfully finished', () => {
        const test = () =>{
            return lexer({verbose: false}).start('define');
        }
        expect(test()).to.be.an('object');
    })

    it('should return an empty tokens array', () =>{ 
        const results =  lexer({verbose: false}).start('define');
        expect(results.tokens).to.not.be.undefined;
        expect(results.tokens).to.not.be.empty;
        expect(results.tokens).to.be.lengthOf(1);
    })

    it('should return an object with an array of tokens', () => {
        let results = lexer({verbose: false}).start('(["thing","sing","wing"]) => {return true}');
        expect(results.tokens).to.be.an('array');
        expect(results.tokens).to.not.be.empty;
    })

    it('should return a token of type const', () => {
        const js= 'const test = "hithere"';
        const result = lexer({verbose:false}).start(js);
        expect(result.tokens[0].type).to.have.string('const');
    });
    it('should return a token of type let', () => {
        const js= 'let test = "hithere"';
        const result = lexer({verbose:false}).start(js);
        expect(result.tokens[0].type).to.have.string('let');
    });
    it('should return a token of type var', () => {
        const js= 'var test = "hithere"';
        const result = lexer({verbose:false}).start(js);
        expect(result.tokens[0].type).to.have.string('var');
    });

    it('should have a token value typeof array', () => {
        const js= 'var test = "hithere"';
        const result = lexer({verbose:false}).start(js);
        expect(result.tokens[0].value).to.be.an('array');
    });
    it('token value length should be six', () => {
        const js= 'var test = "hithere"';
        const result = lexer({verbose:false}).start(js);
        expect(result.tokens[0].value).to.be.lengthOf(6);
    });
   
    it('should be multiline comment', () => {
        const js= '/** im a multiline */';
        const result = lexer({verbose:false}).start(js).tokens[0];
        expect(result.type).to.have.string('multilinecomment');
    });

    it('should be an inline comment', () => {
        const js= '// im a comment';
        const result = lexer({verbose:false}).start(js).tokens[0];
        expect(result.type).to.have.string('inlinecomment');
    });

    it('should be a codeblock', () =>{
        const js= '{ }';
        const result = lexer({verbose:false}).start(js).tokens[0];
        expect(result.type).to.have.string('codeblock');
    });
    it('should be a stringLiteral', () =>{
        const js= '`im a string literal`';
        const result = lexer({verbose:false}).start(js).tokens[0];
        expect(result.type).to.have.string('stringLiteral');
    })

    it('should be a carriagereturn', () =>{
        const js= '\r';
        const result = lexer({verbose:false}).start(js).tokens[0];
        expect(result.type).to.have.string('eol');
    });

    it('should be an eol', () =>{
        const js= '\n';
        const result = lexer({verbose:false}).start(js).tokens[0];
        expect(result.type).to.have.string('carriagereturn');
    });

    it('should be an assigner', () =>{
        const js= '=';
        const result = lexer({verbose:false}).start(js).tokens[0];
        expect(result.type).to.have.string('assigner');
    });

    it('should be an assignee', () =>{
        const js= '= _.thing';
        const result = lexer({verbose:false}).start(js).tokens[2];
        expect(result.type).to.have.string('assignee');
    });

    it('check spacing tokens are being pushed in correctly', () => {
        const js = 'const me = "you"; ';
        const tokens = lexer({verbose:false}).start(js).tokens[0].value;
        
        expect(tokens[0].type).to.have.string('space');
        expect(tokens[2].type).to.have.string('space');
        expect(tokens[4].type).to.have.string('space');
    })

    it('should be a string', () =>{
        const js= '= "thing"';
        const result = lexer({verbose:false}).start(js).tokens[2];
        expect(result.type).to.have.string('string');
    });

}); 

describe('Generator tests', () => {

   it('Should not throw on initialize', () => {
        expect(() => { new Generator()}).to.not.throw();
    });

    it('should return an empty string when no tokens are provided',() => {
        expect(new Generator().start([])).to.be.a('string');
    });

    it('token should compile into a const declaration ', () => {
        const token = { type: 'const', value: [
            {
                type:'name',
                value: 'test'
            },
            {
                type:'space',
                value: ' '
            },
            {
                type:'assigner',
                value: '='
            },
            {
                type:'space',
                value: ' '
            },
            {
                
                type: 'assignee',
                value: '_.foo'
            }
        ]}
        const expectedResult = "const test = _.foo";
        expect(new Generator().start([token])).to.have.string(expectedResult);
    });
});
import LexicalAnalyzer from '../src';
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
}); 
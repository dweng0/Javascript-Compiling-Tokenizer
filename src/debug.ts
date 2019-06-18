import { LexicalAnalyzer, Generator }  from './index';

import * as fs from 'fs';
import * as path from 'path';

const Test = class {
    constructor(){
        let file = path.resolve('examples/mixture.js');
        fs.readFile(file, (err, data) => {
            if(err)
            {
                throw err;
            }
            if(path.extname(file) === '.js')
            {
                const results =  new LexicalAnalyzer({verbose: true}).start(data.toString());
                const newFile = new Generator().start(results.tokens);
                fs.writeFile(path.resolve('examples/ast.json'), JSON.stringify(results), function(err) {
                    if(err) {
                        return console.log(err);
                    }
                    console.log("The file was saved!");
                }); 
                fs.writeFile(path.resolve('examples/newfile.js'), newFile, function(err) {
                    if(err) {
                        return console.log(err);
                    }
                    console.log("The file was saved!");
                }); 
            }
        });
    }
}

new Test();
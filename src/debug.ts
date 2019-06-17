import LexicalAnalyzer  from './index';

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
                debugger;
            }
        });
    }
}

new Test();
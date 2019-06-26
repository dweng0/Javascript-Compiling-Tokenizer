"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("./index");
var fs = require("fs");
var path = require("path");
var Test = /** @class */ (function () {
    function class_1() {
        var file = path.resolve('examples/original.js');
        fs.readFile(file, function (err, data) {
            if (err) {
                throw err;
            }
            if (path.extname(file) === '.js') {
                var results = new index_1.LexicalAnalyzer({ verbose: true }).start(data.toString());
                var newFile = new index_1.Generator().start(results.tokens);
                fs.writeFile(path.resolve('examples/ast.json'), JSON.stringify(results), function (err) {
                    if (err) {
                        return console.log(err);
                    }
                });
                fs.writeFile(path.resolve('examples/newfile.js'), newFile, function (err) {
                    if (err) {
                        return console.log(err);
                    }
                    console.log("The file was saved!");
                });
            }
        });
    }
    return class_1;
}());
new Test();
//# sourceMappingURL=debug.js.map
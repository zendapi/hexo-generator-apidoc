let Promise = require("bluebird");
let fs = require("fs");
let xml2js = require("xml2js");
let doxygenElementParser = require("./xml_element_parser");

module.exports = function(hexo)
{
   let parser = new xml2js.Parser();
   return Promise.mapSeries(hexo.doxygen.files, function(file){
      let filename = hexo.apigen.xmlDir + "/xml/"+file.refid + ".xml";
      return new Promise(function(resolve, reject){
         fs.readFile(filename, function(err, data)
         {
            if (err) {
               reject(err);
               return;
            }
            resolve(data);
         })
      }).then(function(content){
         return new Promise(function(resolve, reject) {
            parser.parseString(content, function (err, fileJsonData) {
               if (err) {
                  reject(err);
                  return;
               }
               fileJsonData = fileJsonData.doxygen.compounddef[0];
               doxygenElementParser.parse_includes(fileJsonData, file, hexo);
               doxygenElementParser.parse_definitions(fileJsonData, file, hexo);
               doxygenElementParser.parse_typedefs(fileJsonData, file, hexo);
               doxygenElementParser.parse_funcs(fileJsonData, file, hexo);
               doxygenElementParser.parse_variables(fileJsonData, file, hexo);
               resolve();
            });
         })
      });
   });
};
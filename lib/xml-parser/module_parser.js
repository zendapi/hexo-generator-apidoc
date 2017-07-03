let Promise = require("bluebird");
let fs = require("fs");
let xml2js = require("xml2js");
let doxygenElementParser = require("./xml_element_parser");
let Utils = require("../utils");

module.exports = function(hexo)
{
   let parser = new xml2js.Parser();
   return Promise.mapSeries(hexo.doxygen.modules, function(module){
      let filename = hexo.apigen.xmlDir + "/xml/"+module.refid + ".xml";
      return new Promise(function(resolve, reject){
         fs.readFile(filename, function(err, data)
         {
            if (err) {
               reject(err);
               return;
            }
            resolve(data);
         });
      }).then(function(content){
         return new Promise(function(resolve, reject){
            parser.parseString(content, function (err, fileJsonData) {
               if (err) {
                  reject(err);
                  return;
               }
               fileJsonData = fileJsonData.doxygen.compounddef[0];
               doxygenElementParser.parse_includes(fileJsonData, module, hexo);
               doxygenElementParser.parse_definitions(fileJsonData, module);
               doxygenElementParser.parse_typedefs(fileJsonData, module, hexo);
               doxygenElementParser.parse_funcs(fileJsonData, module, hexo);
               doxygenElementParser.parse_variables(fileJsonData, module, hexo);
               doxygenElementParser.parse_submodules(fileJsonData, module, hexo);
               module.briefDescription = Utils.to_markdown(fileJsonData.briefdescription);
               module.detailDescription = Utils.to_markdown(fileJsonData.detaileddescription);
               resolve();
            });
         });
      });
   });
};

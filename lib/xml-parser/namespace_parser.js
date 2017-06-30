let Promise = require("bluebird");
let fs = require('fs');
let xml2js = require('xml2js');
let doxygenElementParser = require("./xml_element_parser");

module.exports = function(hexo)
{
   let fileModel = hexo.model("NamespaceModel");
   let parser = new xml2js.Parser();
   return Promise.map(fileModel.toArray(), function(fileObject){
      let filename = hexo.apigen.xmlDir + "/xml/"+fileObject.refid + ".xml";
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
         parser.parseString(content, function (err, fileJsonData) {
            if (err) {
               reject(err);
               return;
            }
            fileJsonData = fileJsonData.doxygen.compounddef[0];
            return Promise.all([
                  doxygenElementParser.parse_subnamespaces(fileJsonData, fileObject, fileModel),
                  doxygenElementParser.parse_classes(fileJsonData, fileObject, fileModel),
                  doxygenElementParser.parse_typedefs(fileJsonData, fileObject, fileModel),
                  doxygenElementParser.parse_funcs(fileJsonData, fileObject, fileModel),
                  doxygenElementParser.parse_variables(fileJsonData, fileObject, fileModel)
               ]
            );
         });
      });
   });
};
let Promise = require("bluebird");
let fs = require('fs');
let xml2js = require('xml2js');
let doxygenElementParser = require("./xml_element_parser");
let Utils = require("../utils");
let _ = require('lodash');

module.exports = function(hexo)
{
   let parser = new xml2js.Parser();
   return Promise.mapSeries(_.values(hexo.doxygen.namespaces), function(namespace){
      let filename = hexo.apigen.xmlDir + "/xml/"+namespace.refid + ".xml";
      if (namespace.name.indexOf('@') != -1) {
         return Promise.resolve();
      }
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
         return new Promise(function(resolve, reject){
            parser.parseString(content, function (err, fileJsonData) {
               if (err) {
                  reject(err);
                  return;
               }
               fileJsonData = fileJsonData.doxygen.compounddef[0];
               doxygenElementParser.parse_subnamespaces(fileJsonData, namespace, hexo);
               doxygenElementParser.parse_classes(fileJsonData, namespace, hexo);
               doxygenElementParser.parse_typedefs(fileJsonData, namespace, hexo);
               doxygenElementParser.parse_funcs(fileJsonData, namespace, hexo);
               doxygenElementParser.parse_variables(fileJsonData, namespace, hexo);
               namespace.briefDescription = Utils.to_markdown(fileJsonData.briefdescription);
               namespace.detailDescription = Utils.to_markdown(fileJsonData.detaileddescription);
               resolve();
            });
         })
      });
   });
};
let Promise = require("bluebird");
let fs = require("fs");
let xml2js = require("xml2js");
let doxygenElementParser = require("./xml_element_parser");
let _ = require('lodash');
let Utils = require("../utils");

module.exports = {
   process : function(context)
   {
      let parser = new xml2js.Parser();
      return Promise.mapSeries(_.values(context.doxygen.files), function(file){
         let filename = context.apigen.xmlDir + "/xml/"+file.refid + ".xml";
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
                  doxygenElementParser.parse_includes(fileJsonData, file, context);
                  doxygenElementParser.parse_definitions(fileJsonData, file, context);
                  doxygenElementParser.parse_typedefs(fileJsonData, file, context);
                  doxygenElementParser.parse_funcs(fileJsonData, file, context);
                  doxygenElementParser.parse_variables(fileJsonData, file, context);
                  doxygenElementParser.parse_classes(fileJsonData, file, context);
                  resolve();
               });
            })
         });
      });
   },
   
   post_parse_hook(context)
   {
      _.forIn(context.doxygen.files, function(file, key){
         Utils.setup_subentity_refs(file, "classes", context);
      });
   }
};
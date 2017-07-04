let Promise = require("bluebird");
let fs = require("fs");
let xml2js = require("xml2js");
let doxygenElementParser = require("./xml_element_parser");
let Utils = require("../utils");
let _ = require('lodash');

function setup_module_subnamespaces(module, namespaces)
{
   let mnamespaces = module.namespaces;
   let mnamespace;
   if (mnamespaces.length > 0) {
      for (let i = 0; i < mnamespaces.length; i++) {
         mnamespace = mnamespaces[i];
         rnamespace = namespaces[mnamespace.refid];
         if (rnamespace) {
            mnamespaces[i] = rnamespace;
         }
      }
   }
}

module.exports = {
   process: function(context)
   {
      let parser = new xml2js.Parser();
      return Promise.mapSeries(_.values(context.doxygen.modules), function(module){
         let filename = context.apigen.xmlDir + "/xml/"+module.refid + ".xml";
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
                  doxygenElementParser.parse_includes(fileJsonData, module, context);
                  doxygenElementParser.parse_definitions(fileJsonData, module);
                  doxygenElementParser.parse_typedefs(fileJsonData, module, context);
                  doxygenElementParser.parse_funcs(fileJsonData, module, context);
                  doxygenElementParser.parse_variables(fileJsonData, module, context);
                  doxygenElementParser.parse_submodules(fileJsonData, module, context);
                  doxygenElementParser.parse_subnamespaces(fileJsonData, module, context);
                  module.briefDescription = Utils.to_markdown(fileJsonData.briefdescription);
                  module.detailDescription = Utils.to_markdown(fileJsonData.detaileddescription);
                  resolve();
               });
            });
         });
      });
   },

   post_parse_hook(context)
   {
      _.forIn(context.doxygen.modules, function(module, key){
         setup_module_subnamespaces(module, context.doxygen.namespaces);
      });
   }
};
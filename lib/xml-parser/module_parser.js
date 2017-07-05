let Promise = require("bluebird");
let fs = require("fs");
let xml2js = require("xml2js");
let doxygenElementParser = require("./xml_element_parser");
let Utils = require("../utils");
let _ = require('lodash');
let sax = require("sax");
let SaxXmlParser = require("./sax_element_parser");

module.exports = {
   process: function(context)
   {
      return Promise.mapSeries(_.values(context.doxygen.modules), function(module){
         let filename = context.apigen.xmlDir + "/xml/"+module.refid + ".xml";
         let parser = new SaxXmlParser(filename, module);
         return parser.process();
         // return new Promise(function(resolve, reject){
         //    fs.readFile(filename, function(err, data)
         //    {
         //       if (err) {
         //          reject(err);
         //          return;
         //       }
         //       resolve(data);
         //    });
         // }).then(function(content){
         //    return new Promise(function(resolve, reject){
         //       parser.parseString(content, function (err, fileJsonData) {
         //          if (err) {
         //             reject(err);
         //             return;
         //          }
         //          fileJsonData = fileJsonData.doxygen.compounddef[0];
         //          module.id = fileJsonData.$.id;
         //          doxygenElementParser.parse_includes(fileJsonData, module, context);
         //          doxygenElementParser.parse_definitions(fileJsonData, module);
         //          doxygenElementParser.parse_typedefs(fileJsonData, module, context);
         //          doxygenElementParser.parse_enums(fileJsonData, module, context);
         //          doxygenElementParser.parse_funcs(fileJsonData, module, context);
         //          doxygenElementParser.parse_variables(fileJsonData, module, context);
         //          doxygenElementParser.parse_submodules(fileJsonData, module, context);
         //          doxygenElementParser.parse_subnamespaces(fileJsonData, module, context);
         //          doxygenElementParser.parse_classes(fileJsonData, module, context);
         //          module.briefDescription = Utils.to_markdown(fileJsonData.briefdescription);
         //          module.detailDescription = Utils.to_markdown(fileJsonData.detaileddescription);
         //          resolve();
         //       });
         //    });
         // });
      });
   },

   post_parse_hook(context)
   {
      _.forIn(context.doxygen.modules, function(module, key){
         // Utils.setup_subentity_refs(module, "namespaces", context);
         // Utils.setup_subentity_refs(module, "classes", context);
         // module.enums.map(function(item){
         //    console.log(item)
         // })
         console.log(module)
      });
   }
};
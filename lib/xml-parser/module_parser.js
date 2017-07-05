let Promise = require("bluebird");
let fs = require("fs");
let xml2js = require("xml2js");
let doxygenElementParser = require("./xml_element_parser");
let Utils = require("../utils");
let _ = require('lodash');
let sax = require("sax");

module.exports = {
   process: function(context)
   {
      let parser = new xml2js.Parser();
      return Promise.mapSeries(_.values(context.doxygen.modules), function(module){
         let filename = context.apigen.xmlDir + "/xml/"+module.refid + ".xml";

         // var saxStream = sax.createStream(true);
         // saxStream.on("error", function (e) {
         //    // unhandled errors will throw, since this is a proper node 
         //    // event emitter. 
         //    console.error("error!", e)
         //    // clear the error 
         //    this._parser.error = null
         //    this._parser.resume()
         // })
         // saxStream.on("opentag", function (node) {
         //    // same object as above 
         //    console.log(node)
         // });
         // saxStream.on("closetag", function (node)
         // {
         //    console.log(node)
         // });
         // saxStream.on("text", function (node)
         // {
         //    console.log(node)
         // });
         // pipe is supported, and it's readable/writable 
         // same chunks coming in also go out. 
         // fs.createReadStream(filename)
         // .pipe(saxStream);
         
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
                  module.id = fileJsonData.$.id;
                  doxygenElementParser.parse_includes(fileJsonData, module, context);
                  doxygenElementParser.parse_definitions(fileJsonData, module);
                  doxygenElementParser.parse_typedefs(fileJsonData, module, context);
                  doxygenElementParser.parse_enums(fileJsonData, module, context);
                  doxygenElementParser.parse_funcs(fileJsonData, module, context);
                  doxygenElementParser.parse_variables(fileJsonData, module, context);
                  doxygenElementParser.parse_submodules(fileJsonData, module, context);
                  doxygenElementParser.parse_subnamespaces(fileJsonData, module, context);
                  doxygenElementParser.parse_classes(fileJsonData, module, context);
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
         Utils.setup_subentity_refs(module, "namespaces", context);
         Utils.setup_subentity_refs(module, "classes", context);
      });
   }
};
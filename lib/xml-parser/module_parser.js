let Promise = require("bluebird");
let fs = require("fs");
let xml2js = require("xml2js");
let _ = require('lodash');
let sax = require("sax");
let SaxXmlParser = require("./sax_element_parser");
let Utils = require("../utils");

module.exports = {
   process: function(context)
   {
      return Promise.mapSeries(_.values(context.doxygen.modules), function(module){
         let filename = context.apigen.xmlDir + "/"+module.refid + ".xml";
         let parser = new SaxXmlParser(filename, module, context);
         return parser.process();
      });
   },

   post_parse_hook(context)
   {
      Utils.set_inner_classes(context.doxygen.modules, context.doxygen.classes);
      let map = {};
      _.values(context.doxygen.modules).map(function(module){
         module.funcs.map(function(func){
            if (func.argsstring.indexOf("->") != -1) {
               let containerId = func.containerId;
               if (!map[containerId]) {
                  map[containerId] = [];
               }
               map[containerId].push(func);
            }
         });
         module.enums.map(function(enumValue){
            let containerId = enumValue.containerId;
            if (!map[containerId]) {
               map[containerId] = [];
            }
            map[containerId].push(enumValue);
         });
      });
      return Promise.all(Utils.fix_object_refs(map, context));
   }
};
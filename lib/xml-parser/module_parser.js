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
         let parser = new SaxXmlParser(filename, module, context);
         return parser.process();
      });
   },

   post_parse_hook(context)
   {
      _.forIn(context.doxygen.modules, function(module, key){
         // console.log(module.funcs)
         let mentities = module["classes"];
         let entities = context.doxygen["classes"];
         let mentity;
         let rentity;
         if (mentities.length > 0) {
            for (let i = 0; i < mentities.length; i++) {
               mentity = mentities[i];
               rentity = entities[mentity.refid];
               if (rentity) {
                  mentities[i].briefDescription = rentity.briefDescription;
               }
            }
         }
      });
      
   }
};
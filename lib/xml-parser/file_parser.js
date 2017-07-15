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
      return Promise.mapSeries(_.values(context.doxygen.files), function(file){
         let filename = context.apigen.xmlDir + "/"+file.refid + ".xml";
         let parser = new SaxXmlParser(filename, file, context);
         return parser.process();
      });
   },

   post_parse_hook(context)
   {
      Utils.set_inner_classes(context.doxygen.files, context.doxygen.classes);
      return Promise.resolve();
   }
};
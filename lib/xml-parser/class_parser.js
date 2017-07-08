let Promise = require("bluebird");
let fs = require("fs");
let xml2js = require("xml2js");
let _ = require('lodash');
let sax = require("sax");
let SaxXmlParser = require("./sax_element_parser");

module.exports = {
   process: function(context)
   {
      return Promise.mapSeries(_.values(context.doxygen.classes), function(cls){
         let filename = context.apigen.xmlDir + "/"+cls.refid + ".xml";
         let parser = new SaxXmlParser(filename, cls, context);
         return parser.process(context.doxygen.classes);
      });
   },
   post_parse_hook(context)
   {
      // _.values(context.doxygen.classes).map(function (item)
      // {
      //    console.log(item)
      // })
      //console.log(context.doxygen.classNameToIdMap)
      return Promise.resolve();
   }
};

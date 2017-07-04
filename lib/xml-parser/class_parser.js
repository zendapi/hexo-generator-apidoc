let Promise = require("bluebird");
let fs = require("fs");
let xml2js = require("xml2js");
let doxygenElementParser = require("./xml_element_parser");
let Utils = require("../utils");
let _ = require('lodash');

module.exports = {
   process : function(context)
   {
      let parser = new xml2js.Parser();
      return Promise.mapSeries(_.values(context.doxygen.classes), function (cls)
      {
         let filename = context.apigen.xmlDir + "/xml/" + cls.refid + ".xml";
         return new Promise(function (resolve, reject)
         {
            fs.readFile(filename, function (err, data)
            {
               if (err) {
                  reject(err);
                  return;
               }
               resolve(data);
            })
         }).then(function (content)
         {
            return new Promise(function (resolve, reject)
            {
               parser.parseString(content, function (err, fileJsonData)
               {
                  if (err) {
                     reject(err);
                     return;
                  }
                  fileJsonData = fileJsonData.doxygen.compounddef[0];
                  doxygenElementParser.parse_includes(fileJsonData, cls, context);
                  // doxygenElementParser.parse_definitions(fileJsonData, file, context);
                  // doxygenElementParser.parse_typedefs(fileJsonData, file, context);
                  // doxygenElementParser.parse_funcs(fileJsonData, file, context);
                  // doxygenElementParser.parse_variables(fileJsonData, file, context);
                  // doxygenElementParser.parse_classes(fileJsonData, file, context);
                  cls.briefDescription = Utils.to_markdown(fileJsonData.briefdescription);
                  cls.detailDescription = Utils.to_markdown(fileJsonData.detaileddescription);
                  resolve();
               });
            })
         });
      })
   },

   post_parse_hook(context)
   {
      
   }
};

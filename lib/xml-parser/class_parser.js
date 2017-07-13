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
      return Promise.mapSeries(_.values(context.doxygen.classes), function(cls){
         let filename = context.apigen.xmlDir + "/"+cls.refid + ".xml";
         let parser = new SaxXmlParser(filename, cls, context);
         return parser.process(context.doxygen.classes);
      });
   },
   post_parse_hook(context)
   {
      let map = {};
      _.values(context.doxygen.classes).map(function(cls){
         if (cls.friends) {
            cls.friends.map(function(friend){
               if (friend.needDetectHtml) {
                  let containerId = friend.containerId;
                  if (!map[containerId]) {
                     map[containerId] = [];
                  }
                  map[containerId].push(friend);
               }
            });
         }
      });
      Utils.fix_class_inherits_objects(context);
      return Promise.all(Utils.fix_class_friend_objects(map, context));
   }
};

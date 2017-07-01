let Promise = require('bluebird');
let pathFn = require('path');
let _ = require('lodash');
let clsParser = require("./xml-parser/class_parser");
let moduleParser = require("./xml-parser/module_parser");
let namespaceParser = require("./xml-parser/namespace_parser");
let fileParser = require("./xml-parser/file_parser");
let GitRepo = require("./git_repo");
let fs = require('fs');
let xml2js = require('xml2js');

function start_load_data(hexo)
{
   let config = hexo.config.api_generator;
   GitRepo.setConfig(config.git_repo, config.git_ref, config.git_stash_name);
   return GitRepo.prepare(hexo).then(function(ret) {
      init_apigen_config(hexo);
      return parse_doxygen_index(hexo);
   })
   .then(function(){
      return Promise.all([
         moduleParser(hexo),
         namespaceParser(hexo),
         clsParser(hexo),
         fileParser(hexo)
      ]);
   })
   .then(function(){
      return GitRepo.restore(hexo);
   })
   .catch(function(error){
      console.log(error);
      return GitRepo.restore(hexo);
   });
}

function init_apigen_config(hexo)
{
   let config = hexo.config.api_generator;
   hexo.apigen.xmlDir = config.git_repo + "/" + config.build_dir;
   hexo.apigen.doxygenConfig = config.git_repo+"/config.doxygen";
}

function parse_doxygen_index(hexo)
{
   let config = hexo.apigen;
   let filename = config.xmlDir + "/xml/index.xml";
   let parser = new xml2js.Parser();
   return new Promise(function(resolve, reject){
      fs.readFile(filename, function(err, data) {
         if (err) {
            reject(err);
            return;
         }
         parser.parseString(data, function (err, result) {
            if (err) {
               reject(err);
               return;
            }
            let currentEntries = [];
            Promise.all(result.doxygenindex.compound.map(function(item) {
               let attrs = item.$;
               let kind = attrs.kind;
               let mname;
               let name = item.name[0];
               if (kind == "class") {
                  mname = "ClassModel";
               } else if (kind == "namespace") {
                  mname = "NamespaceModel";
               } else if (kind == "struct") {
                  mname = "StructModel";
               }else if (kind == "file") {
                  mname = "FileModel";
                  let ext = pathFn.extname(name);
                  if (".h" != ext) {
                     return Promise.resolve();
                  }
               } else if (kind == "group") {
                  mname = "ModuleModel";
               }else {
                  return Promise.resolve();
               }
               let Class = hexo.model(mname);
               let data = {
                  name: name,
                  refid: attrs.refid
               };
               if (!currentEntries[mname]) {
                  currentEntries[mname] = [];
               }
               currentEntries[mname].push(attrs.refid);
               if (kind == "namespace" && ("std" == name || name.indexOf("@") != -1)) {
                  return Promise.resolve();
               }
               let doc = Class.findOne({refid: attrs.refid});
               currentEntries.push(attrs.refid);
               if (!doc) {
                  return Class.insert(data);
               }else {
                  return Promise.resolve();
               }
            })).then(function(){
               Promise.map([
                  "ClassModel",
                  "NamespaceModel",
                  "StructModel",
                  "FileModel",
                  "ModuleModel"
               ], function(mname){
                  let currentItems = currentEntries[mname];
                  let Model = hexo.model(mname);
                  return Promise.all(Model.map(function(doc){
                     if (_.indexOf(currentItems, doc.refid) == -1) {
                        return Model.remove({
                           refid: doc.refid
                        });
                     }
                     return Promise.resolve();
                  }));
               });
               resolve();
            });
         });
      });
   });
}

module.exports = start_load_data;
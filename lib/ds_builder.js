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
         clsParser.process(hexo),
         namespaceParser.process(hexo),
         moduleParser.process(hexo),
         fileParser.process(hexo)
      ]);
   })
   .then(function(){
      return Promise.all([
         clsParser.post_parse_hook(hexo),
         namespaceParser.post_parse_hook(hexo),
         moduleParser.post_parse_hook(hexo),
         fileParser.post_parse_hook(hexo),
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
   hexo.apigen.xmlDir = config.git_repo + "/" + config.build_dir + "/xml";
   hexo.apigen.htmlDir = config.git_repo + "/" + config.build_dir + "/html";
   hexo.apigen.doxygenConfig = config.git_repo+"/config.doxygen";
}

function parse_doxygen_index(hexo)
{
   let config = hexo.apigen;
   let filename = config.xmlDir + "/index.xml";
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
            hexo.doxygen = {
               classNameToIdMap : {}
            };
            Promise.all(result.doxygenindex.compound.map(function(item) {
               let attrs = item.$;
               let kind = attrs.kind;
               let mname;
               let name = item.name[0];
               if (kind == "class" || kind == "struct") {
                  mname = "classes";
                  hexo.doxygen.classNameToIdMap[name.replace(/\s/g, "")] = attrs.refid;
               } else if (kind == "namespace") {
                  mname = "namespaces";
               } else if (kind == "file") {
                  mname = "files";
                  let ext = pathFn.extname(name);
                  if (".h" != ext) {
                     return Promise.resolve();
                  }
               } else if (kind == "group") {
                  mname = "modules";
               }else {
                  return Promise.resolve();
               }
               let data = {
                  name: name,
                  refid: attrs.refid,
                  variables: [],
                  defines: [],
                  typedefs: [],
                  namespaces: [],
                  enums:[],
                  classes: [],
                  funcs: [],
                  modules: []
               };
               if (kind == "struct") {
                  data.isStruct = true;
               }
               if (kind == "namespace" && ("std" == name || name.indexOf("@") != -1)) {
                  return Promise.resolve();
               }
               if (!hexo.doxygen[mname]) {
                  hexo.doxygen[mname] = {};
               }
               hexo.doxygen[mname][attrs.refid] = data;
               resolve(hexo.doxygen);
            }));
         });
      });
   });
}

module.exports = start_load_data;
let Promise = require('bluebird');
let pathFn = require('path');
let _ = require('lodash');
let clsBuilder = require("./class_builder");
let moduleBuilder = require("./module_builder");
let namespaceBuilder = require("./class_builder");
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
   }).catch(function(error){
      console.log(error);
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
            Promise.all(result.doxygenindex.compound.map(function(item) {
               let attrs = item.$;
               let kind = attrs.kind;
               if (kind == "class") {
                  return parse_index_class_info(item, hexo);
               } else if (kind == "namespace") {
                  return parse_index_namespace_info(item, hexo);
               } else if (kind == "struct") {
                  return parse_index_struct_info(item, hexo);
               }else if (kind == "file") {

               } else {
                  return Promise.resolve();
               }
            })).then(function(){
               resolve();
            });
         });
      });
   });
}

function parse_index_class_info(meta, hexo)
{
   let attrs = meta.$;
   let Class = hexo.model("ClassModel");
   let data = {
      name: meta.name.pop(),
      refid: attrs.refid
   };
   let doc = Class.findOne({refid: attrs.refid});
   if (!doc) {
      return Class.insert(data);
   }else {
      return Promise.resolve();
   }
}

function parse_index_namespace_info(meta, hexo) 
{
   let attrs = meta.$;
   let Namespace = hexo.model("NamespaceModel");
   let data = {
      name: meta.name.pop(),
      refid: attrs.refid
   };
   let doc = Namespace.findOne({refid: attrs.refid});
   if (!doc) {
      return Namespace.insert(data);
   }else {
      return Promise.resolve();
   }
}

function parse_index_struct_info(meta, hexo) 
{
   let attrs = meta.$;
   let Struct = hexo.model("StructModel");
   let data = {
      name: meta.name.pop(),
      refid: attrs.refid
   };
   let doc = Struct.findOne({refid: attrs.refid});
   if (!doc) {
      return Struct.insert(data);
   }else {
      return Promise.resolve();
   }
}

module.exports = start_load_data;
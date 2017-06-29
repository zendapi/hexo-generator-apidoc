let Promise = require('bluebird');
let pathFn = require('path');
let Schema = require('warehouse').Schema;
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
   GitRepo.prepare(hexo).then(function(ret) {
      init_apigen_config(hexo);
      parse_doxygen_index(hexo);
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
   fs.readFile(filename, function(err, data) {
      parser.parseString(data, function (err, result) {
         result.doxygenindex.compound.forEach(function(item) {
            let attrs = item.$;
            let kind = attrs.kind;
            if (kind == "class") {
               
            } else if (kind == "namespace") {
               
            } else if (kind == "struct") {
               
            }else if (kind == "file") {
               
            }
         });
      });
   });
   console.log(filename);
}

module.exports = start_load_data;
let Promise = require('bluebird');
let pathFn = require('path');
let _ = require('lodash');
let clsParser = require("./xml-parser/class_parser");
let moduleParser = require("./xml-parser/module_parser");
let namespaceParser = require("./xml-parser/namespace_parser");
let fileParser = require("./xml-parser/file_parser");
let GitRepo = require("./git_repo");
let fs = require('fs');
let SaxXmlParser = require("./xml-parser/sax_element_parser");

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
   hexo.doxygen = {
      classNameToIdMap : {},
      valueItemRepo: {}
   };
   let parser = new SaxXmlParser(filename, hexo.doxygen, hexo);
   return parser.process();
}

module.exports = start_load_data;
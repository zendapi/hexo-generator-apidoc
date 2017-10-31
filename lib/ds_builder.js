let Promise = require('bluebird');
let pathFn = require('path');
let _ = require('lodash');
let clsParser = require("./xml-parser/class_parser");
let moduleParser = require("./xml-parser/module_parser");
let namespaceParser = require("./xml-parser/namespace_parser");
let fileParser = require("./xml-parser/file_parser");
let fs = require('fs');
let SaxXmlParser = require("./xml-parser/sax_element_parser");
const { execSync,spawn } = require('child_process');

function start_load_data(hexo)
{
   return new Promise(function (resolve, reject)
   {
      init_apigen_config(hexo);
      return generate_project_xml_by_doxygen(hexo, resolve, reject);
   })
   .then(function(){
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
   .catch(function(error){
      console.log(error);
   });
}

function generate_project_xml_by_doxygen(hexo, resolve, reject)
{
   return new Promise(function ()
   {
      // Work with the repository object here.
      const ls = spawn('doxygen', [hexo.apigen.doxygenConfig], {
         cwd:hexo.config.cpp_generator.project_source_dir
      });
      ls.stdout.on('data', (data) => {
         hexo.log.info(`${data}`);
      });
      ls.stderr.on('data', (data) => {
         hexo.log.warn(`${data}`);
      });
      ls.on('close', (code) => {
         if (0 !== code) {
            hexo.log.error("apigen error");
            reject("apigen error");
         } else {
            resolve();
         }
      });
   });
}

function init_apigen_config(hexo)
{
   let config = hexo.config.cpp_generator;
   let tempDir = config.temp_dir;
   let buildDir = config.project_source_dir+"/temp/apidoc";
   if (!fs.existsSync(config.project_source_dir + "/temp")) {
      fs.mkdirSync(config.project_source_dir + "/temp");
   }
   hexo.apigen.xmlDir = buildDir + "/xml";
   hexo.apigen.htmlDir = buildDir + "/html";
   hexo.apigen.doxygenConfig = config.project_source_dir + "/config.doxygen";

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
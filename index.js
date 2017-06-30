"use strict";
/*
 * TopJs Framework (http://www.topjs.org/)
 *
 * @link      http://github.com/qcoreteam/topjs for the canonical source repository
 * @copyright Copyright (c) 2016-2017 QCoreTeam (http://www.qcoreteam.org)
 * @license   http://www.topjs.org/license/new-bsd New BSD License
 */
let DsBuilder = require("./lib/ds_builder");
let Models = require("./lib/models");
let Promise = require("bluebird");

hexo.apigen = {};

function register_models(hexo)
{
   let db = hexo.database;
   let keys = Object.keys(Models);
   let key = '';
   for (let i = 0, len = keys.length; i < len; i++) {
      key = keys[i];
      db.model(key, Models[key](hexo));
   }
}

hexo.extend.filter.register("before_generate", function(){
   register_models(hexo);
   return DsBuilder(hexo);
}, 1);

hexo.extend.generator.register('apidocindex', function(locals) {
   let db = hexo.database;
   let fileModel = db.model("FileModel");
   let config = hexo.config;
   let basePath = config.apidoc_path;
   return {
      path: basePath+"/",
      layout: ["api/index"]
   };
});

hexo.extend.generator.register('apidocclasses', function(locals) {
   let db = hexo.database;
   let config = hexo.config;
   let basePath = config.apidoc_path;
   return {
      path: basePath+"/classes.html",
      layout: ["api/classes"]
   };
});

hexo.extend.generator.register('apidocnamespaces', function(locals) {
   let db = hexo.database;
   let config = hexo.config;
   let basePath = config.apidoc_path;
   return {
      path: basePath+"/namespaces.html",
      layout: ["api/namespaces"]
   };
});

hexo.extend.generator.register('apidocmodules', function(locals) {
   let db = hexo.database;
   let config = hexo.config;
   let basePath = config.apidoc_path;
   return {
      path: basePath+"/modules.html",
      layout: ["api/modules"]
   };
});
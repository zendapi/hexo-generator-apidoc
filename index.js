"use strict";
/*
 * TopJs Framework (http://www.topjs.org/)
 *
 * @link      http://github.com/qcoreteam/topjs for the canonical source repository
 * @copyright Copyright (c) 2016-2017 QCoreTeam (http://www.qcoreteam.org)
 * @license   http://www.topjs.org/license/new-bsd New BSD License
 */
let DsBuilder = require("./lib/ds_builder");
let Promise = require("bluebird");
require("./lib/helper")(hexo);
let _ = require('lodash');
let Utils = require("./lib/utils");

hexo.apigen = {};

hexo.extend.filter.register("before_generate", function(){
   return DsBuilder(hexo);
}, 1);

hexo.extend.generator.register('apidocindex', function(locals) {
   let config = hexo.config;
   let basePath = config.apidoc_path;
   return {
      path: basePath+"/",
      layout: ["api/index"],
      data : {
         namespaces: hexo.doxygen.namespaces,
         modules: hexo.doxygen.modules,
         layout: "apiindex"
      }
   };
});

hexo.extend.generator.register('apidocnamespaces', function(locals) {
   let config = hexo.config;
   let basePath = config.apidoc_path;
   return {
      path: basePath+"/namespaces.html",
      layout: ["api/namespaces"],
      data: {
         layout: "apinamespaces",
         namespaces: hexo.doxygen.namespaces
      }
   };
});

hexo.extend.generator.register('apidocnamespacecontent', function(locals) {
   let config = hexo.config;
   let basePath = config.apidoc_path;
   let namespaces = hexo.doxygen.namespaces;
   return _.values(namespaces).map(function(namespace){
      return {
         path: basePath+"/"+namespace.refid+".html",
         layout: ["api/namespace_content"],
         data: {
            layout: "apinamespacecontent",
            module: namespace,
            modules: namespaces
         }
      };
   });
});

hexo.extend.generator.register('apidocmodulecontent', function(locals) {
   let config = hexo.config;
   let basePath = config.apidoc_path;
   let modules = Utils.generate_flat_module_list(_.values(hexo.doxygen.modules), 0, null, "");
   return modules.map(function(module){
      return {
         path: basePath+"/"+module.refid+".html",
         layout: ["api/module_content"],
         data: {
            layout: "apimodulecontent",
            module: module,
            modules: hexo.doxygen.modules
         }
      };
   });
});

hexo.extend.generator.register('apidocmodules', function(locals) {
   let config = hexo.config;
   let basePath = config.apidoc_path;
   return {
      path: basePath+"/modules.html",
      layout: ["api/modules"],
      data: {
         layout: "apimodules",
         modules: hexo.doxygen.modules
      }
   };
});

hexo.extend.generator.register('apiglobals', function(locals) {
   let config = hexo.config;
   let basePath = config.apidoc_path;
   return {
      path: basePath+"/globals.html",
      layout: ["api/globals"],
      data: {
         layout: "apiglobals",
         globals: hexo.doxygen.files
      }
   };
});

hexo.extend.generator.register('apifiles', function(locals) {
   let config = hexo.config;
   let basePath = config.apidoc_path;
   return {
      path: basePath+"/files.html",
      layout: ["api/files"],
      data: {
         layout: "apifiles",
         files: hexo.doxygen.files
      }
   };
});
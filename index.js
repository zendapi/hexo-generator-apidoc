"use strict";
/*
 * zendAPI library (http://www.zendapi.org/)
 *
 * @link      http://github.com/qcoreteam/topjs for the canonical source repository
 * @copyright Copyright (c) 2016-2017 QCoreTeam (http://www.qcoreteam.org)
 * @license   http://www.topjs.org/license/new-bsd New BSD License
 */
let DsBuilder = require("./lib/ds_builder");
let Promise = require("bluebird");
let _ = require('lodash');
let fs = require('fs');
let Git = require("nodegit");
let path = require('path');
require("./lib/helper")(hexo);
let Utils = require("./lib/utils");
let ncp = require('ncp').ncp;
let fx = require('mkdir-recursive');
ncp.limit = 16;

let generateApiDocs = !!hexo.env.args.withApidoc;
let forceUpdateRepo = !!hexo.env.args.forceUpdateRepo;
hexo.apigen = {};
let rootDir = path.normalize(__dirname+"/../..");
let tempDir = rootDir+"/temp";
let config = hexo.config.cpp_generator;
let projectRepo = config.repo_url;
let sourceDir = tempDir + "/" +config.project_name;
config.temp_dir = tempDir;
config.project_source_dir = sourceDir;
config.project_local_apidoc = rootDir+"/temp/" +config.project_name+ "/temp/apidoc_html";
config.apidoc_path = "api";
let doGenerted = false;

if (generateApiDocs) {
   doGenerted = true;
   hexo.extend.filter.register("before_generate", function(){
      return new Promise(function (resolve, reject)
      {
         if (!fs.existsSync(sourceDir)) {
            hexo.log.info(`begin clone repo ${projectRepo}`);
            return Git.Clone(projectRepo, sourceDir).then(function(repository){
               hexo.log.info(`clone repo ${projectRepo} done`);
               resolve(sourceDir);
            }).catch(function(error){
               reject(error);
            });
         }else {
            if (forceUpdateRepo) {
               hexo.log.info(`begin update repo ${projectRepo}`);
               let repository;
               // first reset HEAD
               return Git.Repository.open(sourceDir).then(function(repo) {
                  // Use repository
                  repository = repo;
                  return repository.fetchAll({
                     callbacks: {
                        credentials: function(url, userName) {
                           return Git.Cred.sshKeyFromAgent(userName);
                        },
                        certificateCheck: function() {
                           return 1;
                        }
                     }
                  });
               }).then(function(){
                  return repository.mergeBranches("master", "origin/master");
               }).then(function(){
                  hexo.log.info(`update repo ${projectRepo} done`);
                  resolve(sourceDir);
               }).catch(function(error){
                  hexo.log.error(error);
                  reject();
               });
            }else{
               resolve(sourceDir);
            }
         }
      }).then(function ()
      {
         return DsBuilder(hexo);
      });
   }, 1);
   
   hexo.extend.generator.register('apidocindex', function(locals) {
      let config = hexo.config.cpp_generator;
      let basePath = config.publish_dir;
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
      let config = hexo.config.cpp_generator;
      let basePath = config.publish_dir;
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
      let config = hexo.config.cpp_generator;
      let basePath = config.publish_dir;
      let namespaces = hexo.doxygen.namespaces;
      return _.values(namespaces).map(function(namespace){
         return {
            path: basePath+"/"+namespace.refid+".html",
            layout: ["api/namespace_content"],
            data: {
               layout: "apinamespacecontent",
               namespace: namespace,
               namespaces: namespaces
            }
         };
      });
   });

   hexo.extend.generator.register('apidocmodulecontent', function(locals) {
      let config = hexo.config.cpp_generator;
      let basePath = config.publish_dir;
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

   hexo.extend.generator.register('apidocclasscontent', function(locals) {
      let config = hexo.config.cpp_generator;
      let basePath = config.publish_dir;
      let classes = hexo.doxygen.classes;
      return _.values(classes).map(function(cls){
         return {
            path: basePath+"/"+cls.refid+".html",
            layout: ["api/class_content"],
            data: {
               layout: "apiclasscontent",
               cls: cls,
               classes: hexo.doxygen.classes,
               files: hexo.doxygen.files
            }
         };
      });
   });

   hexo.extend.generator.register('apidocfilecontent', function(locals) {
      let config = hexo.config.cpp_generator;
      let basePath = config.publish_dir;
      let files = hexo.doxygen.files;
      return _.values(files).map(function(file){
         return {
            path: basePath+"/file"+file.refid+".html",
            layout: ["api/file_content"],
            data: {
               layout: "apifilecontent",
               file: file,
               files: files
            }
         };
      });
   });


   hexo.extend.generator.register('apidocmodules', function(locals) {
      let config = hexo.config.cpp_generator;
      let basePath = config.publish_dir;
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
      let config = hexo.config.cpp_generator;
      let basePath = config.publish_dir;
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
      let config = hexo.config.cpp_generator;
      let basePath = config.publish_dir;
      return {
         path: basePath+"/files.html",
         layout: ["api/files"],
         data: {
            layout: "apifiles",
            files: hexo.doxygen.files
         }
      };
   });
} else {
   hexo.extend.filter.register("before_generate", function(){
      let srcPath = rootDir + "/public/"+config.publish_dir;
      if (fs.existsSync(config.project_local_apidoc) && !fs.existsSync(srcPath+"/index.html")) {
         fx.mkdirSync(srcPath);
         hexo.log.info('Copying cpp generated files from cache directory to publish directory...');
         ncp(config.project_local_apidoc, srcPath, function (err) {
            if (err) {
               return hexo.log.error(err);
            }
            hexo.log.info('Copying files complete.');
         });
      }
   });
}

hexo.extend.filter.register("before_exit", function(){
   let srcPath = rootDir + "/public/"+config.publish_dir;
   if (doGenerted) {
      hexo.log.info('Copying cpp generated files to cache directory...');
      ncp(srcPath, config.project_local_apidoc, function (err) {
         if (err) {
            return hexo.log.error(err);
         }
         hexo.log.info('Copying files complete.');
      });
   }
});


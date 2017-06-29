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

hexo.on('generateBefore', function(){
   register_models(hexo);
   DsBuilder(hexo);
});

hexo.extend.generator.register('clscontent', function(locals) {
   return {
      path: "/api",
      layout: ["apidoc/index"],
      data: {'xiux':1}
   };
});
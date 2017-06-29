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
      db.model("ClassModel", Models[key](hexo));
   }
}

hexo.extend.filter.register("before_generate", function(){
   register_models(hexo);
   return DsBuilder(hexo);
}, 1);

hexo.extend.generator.register('clscontent', function(locals) {
   let db = hexo.database;
   console.log(db.model("ClassModel").count());
   console.log(db.model("StructModel").count());
   return {
      path: "/api",
      layout: ["apidoc/index"],
      data: {'xiux':1}
   };
});
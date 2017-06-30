'use strict';

let Schema = require('warehouse').Schema;
let moment = require('moment');
let pathFn = require('path');
let Promise = require('bluebird');
let _ = require('lodash');

module.exports = function (hexo)
{
   let File = new Schema({
      refid: String,
      name: {type: String, default: ''},
      definitions: {type:Array, default:[]},
      typedefs: {type:Array, default:[]},
      funcs: {type:Array, default:[]},
      includes: {type:Array, default:[]},
      variables: {type:Array, default:[]}
   });
   return File;
};
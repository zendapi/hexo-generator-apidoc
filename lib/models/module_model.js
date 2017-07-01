'use strict';

var Schema = require('warehouse').Schema;
var moment = require('moment');
var pathFn = require('path');
var Promise = require('bluebird');
var _ = require('lodash');

module.exports = function (hexo)
{
   let Module = new Schema({
      refid: String,
      name: {type: String, default: ''},
      parent: {type: String, ref: 'Category', default:""},
      classes: {type: Array, default: []},
      variables: {type:Array, default:[]},
      funcs: {type:Array, default:[]},
      typedefs: {type:Array, default:[]},
      definitions: {type:Array, default:[]},
      modules:{type:Array, default:[]}
   });
   return Module;
};
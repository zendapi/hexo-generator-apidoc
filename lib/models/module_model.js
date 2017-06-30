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
      name: {type: String, default: ''}
   });
   return Module;
};
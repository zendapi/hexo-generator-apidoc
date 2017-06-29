'use strict';

var Schema = require('warehouse').Schema;
var pathFn = require('path');
var Promise = require('bluebird');
var _ = require('lodash');

module.exports = function (hexo)
{
   let Namespace = new Schema({
      refid: String,
      name: {type: String, default: ''}
   });
   return Namespace;
};
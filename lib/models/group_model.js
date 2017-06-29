'use strict';

var Schema = require('warehouse').Schema;
var moment = require('moment');
var pathFn = require('path');
var Promise = require('bluebird');
var _ = require('lodash');

module.exports = function (hexo)
{
   let Group = new Schema({
      id: String,
      name: {type: String, default: ''}
   });
   return Group;
};
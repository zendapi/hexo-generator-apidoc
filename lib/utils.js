"use strict";

let _ = require('lodash');
let clone = require("clone");
let fs = require('fs');
let Promise = require("bluebird");
let toString = Object.prototype.toString;

function find_entry_by_refid(entries, refid)
{
   return _.find(entries, function(entry){
      return entry.refid == refid;
   });
}


function parse_entity_id(id)
{
   let marker = id.lastIndexOf('_');
   return {
      containerId: id.substring(0, marker),
      id: id.substring(marker+1)
   };
}

function generate_flat_module_list(modules, depth, parent, prefix)
{
   let ret = [];
   prefix = prefix || "";
   ++depth;
   for(let i = 0; i < modules.length; i++) {
      let module = clone(modules[i]);
      let name =  prefix != "" ? prefix+"/"+module.name: module.name;
      module.qualifiedName = name;
      if (parent) {
         module.parent = parent.refid;
      }
      ret.push(module);
      ret = _.concat(ret, module.modules ? generate_flat_module_list(module.modules, depth, module, name) : []);
   }
   return ret;
}

function url_for_api_entity(context, refid)
{
   let basePath = context.config.apidoc_path || "api";
   let url_for = context.extend.helper.get('url_for');
   if (refid[0] == "_" ) {
      refid = "file"+refid;
   }
   return url_for.call(context, basePath + "/" + refid + ".html");
}

function url_for_entity_detail(context, containerId, id)
{
   let basePath = context.config.apidoc_path || "api";
   let url_for = context.extend.helper.get('url_for');
   if (containerId[0] == "_" ) {
      containerId = "file"+containerId;
   }
   return url_for.call(context, basePath + "/"+containerId+".html#"+id);
}

function set_inner_classes(collection, classes)
{
   _.forIn(collection, function(model, key){
      let mentities = model.classes;
      let mentity;
      let rentity;
      if (mentities.length > 0) {
         for (let i = 0; i < mentities.length; i++) {
            mentity = mentities[i];
            rentity = classes[mentity.refid];
            if (rentity) {
               mentities[i].briefDescription = rentity.briefDescription;
               mentities[i].url = rentity.url;
               if (rentity.isStruct) {
                  mentities[i].isStruct = true;
               }
               if (rentity.tags) {
                  mentities[i].tags = rentity.tags;
               }
               if (rentity.isTemplate) {
                  mentities[i].isTemplate = true;
                  mentities[i].templateParams = rentity.templateParams;
                  mentities[i].tplParamsString = rentity.tplParamsString;
               }
            }
         }
      }
   });
}

function fix_class_inherits_objects(context)
{
   let valueRepo = context.doxygen.valueItemRepo;
   let clsRepo = context.doxygen.classes;
   _.values(clsRepo).map(function (cls)
   {
      let inherits = {};
      cls.inherits.map(function(member){
         if (valueRepo[member.refid]){
            // 暂时只考虑zapi名称空间里面的类
            let obj = clone(valueRepo[member.refid]);
            let clsObj = clsRepo[obj.containerId];
            // obj.className
            let clsName = clsObj.name;
            if (clsName != cls.name) {
               let target;
               if (!inherits[obj.objectType]){
                  target = inherits[obj.objectType] = {};
               } else {
                  target = inherits[obj.objectType]
               }
               if (!is_array(target[clsName])){
                  target[clsName] = [];
               }
               target[clsName].push(obj);
            }
         }
      });
      // 进行排序
      cls.inherits = inherits;
      for (let typeKey in inherits) {
         let typeInherits = inherits[typeKey];
         for (let clsName in typeInherits) {

            if (typeKey == "public-func" || typeKey == "public-static-func" ||
               typeKey == "protected-func" || typeKey == "protected-static-func")
            {
               let parts = clsName.split("::");
               let constructorName = parts.pop();
               let desctructorName = '~'+constructorName;
               let special = [constructorName, desctructorName];
               typeInherits[clsName].sort(function (left, right) {
                  let leftName = left.simpleName;
                  let rightName = right.simpleName;
                  if (_.indexOf(special, leftName) != -1 && _.indexOf(special, rightName) != -1) {
                     if (leftName == desctructorName && rightName == constructorName) {
                        return 1;
                     } else if (leftName == constructorName && rightName == desctructorName) {
                        return -1;
                     }
                     return 0;
                  } else if (_.indexOf(special, leftName) != -1 && _.indexOf(special, rightName) == -1) {
                     return -1;
                  } else if (_.indexOf(special, leftName) == -1 && _.indexOf(special, rightName) != -1) {
                     return 1;
                  } else {
                     // 按照字母表排序呢
                     if (leftName < rightName) {
                        return -1;
                     } else if (leftName == rightName) {
                        return 0;
                     } else {
                        return 1;
                     }
                  }
               });
            } else {
               typeInherits[clsName].sort(function (left, right) {
                  let leftName = left.simpleName;
                  let rightName = right.simpleName;
                  // 按照字母表排序呢
                  if (leftName < rightName) {
                     return -1;
                  } else if (leftName == rightName) {
                     return 0;
                  } else {
                     return 1;
                  }
               });
            }

         }
      }
   });
}



function is_object(value)
{
   return toString.call(value) === '[object Object]';
}

function is_string(value)
{
   return typeof value === 'string';
}

function is_boolean(value)
{
   return typeof value === 'boolean';
}

function is_array(value)
{
   return toString.call(value) == "[object Array]";
}

module.exports = {
   find_entry_by_refid: find_entry_by_refid,
   parse_entity_id: parse_entity_id,
   generate_flat_module_list: generate_flat_module_list,
   set_inner_classes: set_inner_classes,
   url_for_api_entity: url_for_api_entity,
   url_for_entity_detail: url_for_entity_detail,
   fix_class_inherits_objects: fix_class_inherits_objects,
   is_object: is_object,
   is_string:is_string,
   is_boolean: is_boolean,
   is_array:is_array
};


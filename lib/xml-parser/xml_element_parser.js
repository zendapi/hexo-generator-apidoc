let Utils = require("../utils");
let Promise = require("bluebird");
let _ = require('lodash');

function parse_includes(data, model, context)
{
   if (data.includes) {
      model.includes = data.includes.map(function (item)
      {
         let attrs = item.$;
         return {
            path: item._,
            local: attrs.local,
            refid: attrs.refid ? attrs.refid : null
         };
      });
   } else {
      model.includes = [];
   }
}

function parse_definitions(data, model, contex)
{
   if (data.sectiondef) {
      for(let i = 0; i < data.sectiondef.length; i++) {
         let sectiondef = data.sectiondef[i];
         if (sectiondef.$.kind == "define") {
            model.defines = sectiondef.memberdef.map(function(memberDef){
               let attrs = memberDef.$;
               let ids = Utils.parse_entity_id(attrs.id);
               let ret= {
                  name: memberDef.name[0],
                  containerId: ids.containerId,
                  id: ids.id,
                  accessLevel: attrs.prot,
                  static: attrs.static == "yes",
                  initializer: memberDef.initializer ? memberDef.initializer[0] : ""
               };
               if (memberDef.param && memberDef.param.length > 0) {
                  ret.params = memberDef.param.map(function(param){
                     if (param.defname) {
                        return param.defname[0];
                     }
                  });
                  if (ret.params.length == 1 && ret.params[0] == undefined){
                     ret.params = [];
                  }
               } else {
                  ret.params = [];
               }
               ret.briefDescription = Utils.to_markdown(memberDef.briefdescription);
               ret.detailDescription = Utils.to_markdown(memberDef.detaileddescription);
               ret.inbodyDescription = Utils.to_markdown(memberDef.inbodydescription);
               ret.location = memberDef.location[0].$;
               return ret;
            });
         }
      }
   } else {
      model.defines = [];
   }
}

function parse_typedefs(data, model, context)
{
   if (data.sectiondef) {
      for(let i = 0; i < data.sectiondef.length; i++) {
         let sectiondef = data.sectiondef[i];
         if (sectiondef.$.kind == "typedef") {
            model.typedefs = sectiondef.memberdef.map(function(memberDef){
               let attrs = memberDef.$;
               let ids = Utils.parse_entity_id(attrs.id);
               let ret = {
                  name: memberDef.name[0],
                  id: ids.id,
                  containerId: ids.containerId,
                  accessLevel: attrs.prot,
                  static: attrs.static == "yes",
                  definition: memberDef.definition[0],
                  argsString: memberDef.argsstring,
                  briefDescription : Utils.to_markdown(memberDef.briefdescription),
                  detailDescription : Utils.to_markdown(memberDef.detaileddescription),
                  inbodyDescription : Utils.to_markdown(memberDef.inbodydescription),
                  location : memberDef.location[0].$
               };
               if (memberDef.type) {
                  if (typeof memberDef.type[0] == "string") {
                     ret.type = memberDef.type[0];
                  } else {
                     ret.type = parse_type(memberDef.type[0]);
                  }
               }
               return ret;
            });
         }
      }
   } else {
      model.typedefs = [];
   }
}

function parse_type(typeMenber)
{
   let items = [];
   if (typeof typeMenber == "object") {
      if (typeMenber.$) {
         let attrs = typeMenber.$;
         let ids = Utils.parse_entity_id(attrs.refid);
         items.push({
            name: typeMenber._,
            kindRef: attrs.kindref,
            containerId: ids.containerId,
            id: ids.id
         });
         if (typeMenber.ref && typeMenber.ref.length > 0) {
            for (let i = 0; i < typeMenber.ref.length; i++) {
               items = _.concat(items, parse_type(typeMenber.ref[i]));
            }
         }
      } else if (typeMenber.ref && typeMenber.ref.length > 0) {
         for (let i = 0; i < typeMenber.ref.length; i++) {
            items = _.concat(items, parse_type(typeMenber.ref[i]));
         }
      }
   }
   return items;
}


function parse_funcs(data, model, context)
{
   if (data.sectiondef) {
      for(let i = 0; i < data.sectiondef.length; i++) {
         let sectiondef = data.sectiondef[i];
         if (sectiondef.$.kind == "func") {
            model.funcs = sectiondef.memberdef.map(function(memberDef){
               let attrs = memberDef.$;
               let ids = Utils.parse_entity_id(attrs.id);
               let ret = {
                  name: memberDef.name[0],
                  containerId: ids.containerId,
                  id: ids.id,
                  accessLevel: attrs.prot,
                  static: attrs.static == "yes",
                  const: attrs.const == "yes",
                  explicit: attrs.explicit == "yes",
                  virtual: attrs.virt == "non-virtual",
                  definition: memberDef.definition[0],
                  argsString: memberDef.argsstring[0],
                  type: memberDef.type[0],
                  briefDescription : Utils.to_markdown(memberDef.briefdescription),
                  detailDescription : Utils.to_markdown(memberDef.detaileddescription),
                  inbodyDescription : Utils.to_markdown(memberDef.inbodydescription),
                  location : memberDef.location[0].$
               };
               if (memberDef.templateparamlist && memberDef.templateparamlist.length > 0) {
                  ret.templateParams = memberDef.templateparamlist.map(function(item){
                     let param = {};
                     if (item.param && item.param.length > 0) {
                        item.param.map(function (paramItem)
                        {
                           if (paramItem.type && paramItem.type.length > 0) {
                              param.type = paramItem.type[0];
                           }
                           if (paramItem.declname && paramItem.declname.length > 0) {
                              param.declName = paramItem.declname[0];
                           }
                        })
                     }
                     return param;
                  });
               }
               if (memberDef.param && memberDef.param.length > 0) {
                  ret.params = memberDef.param.map(function (paramItem)
                  {
                     let param = {};
                     if (paramItem.type && paramItem.type.length > 0) {
                        param.type = paramItem.type[0];
                     }
                     if (paramItem.declname && paramItem.declname.length > 0) {
                        param.declName = paramItem.declname[0];
                     }
                     return param;
                  })
               }
               return ret;
            });
         }
      }
   } else {
      model.funcs = [];
   }
}

function parse_variables(data, model, context)
{
   if (data.sectiondef) {
      for(let i = 0; i < data.sectiondef.length; i++) {
         let sectiondef = data.sectiondef[i];
         if (sectiondef.$.kind == "var") {
            model.variables = sectiondef.memberdef.map(function(memberDef){
               let attrs = memberDef.$;
               let ids = Utils.parse_entity_id(attrs.id);
               return {
                  name: memberDef.name[0],
                  id: ids.id,
                  containerId: ids.containerId,
                  type: memberDef.type[0],
                  accessLevel: attrs.prot,
                  static: attrs.static == "yes",
                  mutable: attrs.mutable == "yes",
                  definition: memberDef.definition[0],
                  argsString: memberDef.argsstring[0],
                  initializer: memberDef.initializer && memberDef.initializer[0],
                  briefDescription : Utils.to_markdown(memberDef.briefdescription),
                  detailDescription : Utils.to_markdown(memberDef.detaileddescription),
                  inbodyDescription : Utils.to_markdown(memberDef.inbodydescription),
                  location : memberDef.location[0].$
               };
            });
         }
      }
   } else {
      model.variables = [];
   }
}

function parse_enums(data, model, context)
{
   if (data.sectiondef) {
      for(let i = 0; i < data.sectiondef.length; i++) {
         let sectiondef = data.sectiondef[i];
         if (sectiondef.$.kind == "enum") {
            model.enums = sectiondef.memberdef.map(function(memberDef){
               let attrs = memberDef.$;
               let ids = Utils.parse_entity_id(attrs.id);
               let ret = {
                  name: memberDef.name[0],
                  id: ids.id,
                  containerId: ids.containerId,
                  accessLevel: attrs.prot,
                  briefDescription : Utils.to_markdown(memberDef.briefdescription),
                  detailDescription : Utils.to_markdown(memberDef.detaileddescription),
                  inbodyDescription : Utils.to_markdown(memberDef.inbodydescription),
                  location : memberDef.location[0].$,
                  enumValues: []
               };
               if (memberDef.enumvalue && memberDef.enumvalue.length > 0) {
                  ret.enumValues = memberDef.enumvalue.map(function(enumValue){
                     return {
                        name: enumValue.name[0],
                        initializer: enumValue.initializer ? enumValue.initializer: "",
                        briefDescription : Utils.to_markdown(memberDef.briefdescription),
                        detailDescription : Utils.to_markdown(memberDef.detaileddescription),
                     }
                  });
               }
               return ret;
            });
         }
      }
   } else {
      model.enums = [];
   }
}

function parse_subnamespaces(data, model, context)
{
   if (data.innernamespace && data.innernamespace.length > 0) {
      model.namespaces = data.innernamespace.map(function(memberDef){
         let attrs = memberDef.$;
         if (memberDef._ != "std") {
            return {
               name: memberDef._,
               refid: attrs.refid
            };
         }
      });
   } else {
      model.namespaces = [];
   }
}

function parse_classes(data, model, context)
{
   if (data.innerclass && data.innerclass.length > 0) {
      model.classes = data.innerclass.map(function(memberDef){
         let attrs = memberDef.$;
         return {
            name: memberDef._,
            refid: attrs.refid,
            accessLevel: attrs.prot
         };
      });
   } else {
      model.classes = [];
   }
}

function parse_submodules(data, model, context)
{
   if (data.innergroup && data.innergroup.length > 0) {
      model.modules = data.innergroup.map(function(memberDef){
         let attrs = memberDef.$;
         let submodule = Utils.find_entry_by_refid(context.doxygen.modules, attrs.refid);
         if (submodule) {
            submodule.parent = model.refid;
         }
         return submodule;
      });
   } else {
      model.modules = [];
   }
}

module.exports = {
   parse_variables: parse_variables,
   parse_definitions: parse_definitions,
   parse_funcs: parse_funcs,
   parse_enums: parse_enums,
   parse_includes: parse_includes,
   parse_typedefs: parse_typedefs,
   parse_subnamespaces: parse_subnamespaces,
   parse_classes: parse_classes,
   parse_submodules: parse_submodules
};
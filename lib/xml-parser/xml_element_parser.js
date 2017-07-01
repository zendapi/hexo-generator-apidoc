let Utils = require("../utils");
let Promise = require("bluebird");

function parse_includes(data, frecord, fmodel)
{
   if (data.includes) {
      frecord.includes = data.includes.map(function (item)
      {
         let attrs = item.$;
         return {
            path: item._,
            local: attrs.local,
            refid: attrs.refid ? attrs.refid : null
         };
      });
      return fmodel.save(frecord);
   }
   return Promise.resolve();
}

function parse_definitions(data, frecord, fmodel)
{
   if (data.sectiondef) {
      for(let i = 0; i < data.sectiondef.length; i++) {
         let sectiondef = data.sectiondef[i];
         if (sectiondef.$.kind == "define") {
            frecord.defines = sectiondef.memberdef.map(function(memberDef){
               let attrs = memberDef.$;
               let ret= {
                  name: memberDef.name[0],
                  id: attrs.id,
                  accessLevel: attrs.prot,
                  static: attrs.static == "yes"
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
               }
               ret.briefDescription = memberDef.briefdescription[0];
               ret.detailDescription = memberDef.detaileddescription[0];
               ret.inbodyDescription = memberDef.inbodydescription[0];
               ret.location = memberDef.location[0].$;
               return ret;
            });
            return fmodel.save(frecord);
         }
      }
   }
   return Promise.resolve();
}

function parse_typedefs(data, frecord, fmodel)
{
   if (data.sectiondef) {
      for(let i = 0; i < data.sectiondef.length; i++) {
         let sectiondef = data.sectiondef[i];
         if (sectiondef.$.kind == "typedef") {
            frecord.typedefs = sectiondef.memberdef.map(function(memberDef){
               let attrs = memberDef.$;
               return {
                  name: memberDef.name[0],
                  id: attrs.id,
                  accessLevel: attrs.prot,
                  static: attrs.static == "yes",
                  type: memberDef.type[0],
                  definition: memberDef.definition[0],
                  argsString: memberDef.argsstring,
                  briefDescription : memberDef.briefdescription[0],
                  detailDescription : memberDef.detaileddescription[0],
                  inbodyDescription : memberDef.inbodydescription[0],
                  location : memberDef.location[0].$
               };
            });
            return fmodel.save(frecord);
         }
      }
   }
   return Promise.resolve();
}


function parse_funcs(data, frecord, fmodel)
{
   if (data.sectiondef) {
      for(let i = 0; i < data.sectiondef.length; i++) {
         let sectiondef = data.sectiondef[i];
         if (sectiondef.$.kind == "func") {
            frecord.funcs = sectiondef.memberdef.map(function(memberDef){
               let attrs = memberDef.$;
               let ret = {
                  name: memberDef.name[0],
                  id: attrs.id,
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
            });
            return fmodel.save(frecord);
         }
      }
   }
   return Promise.resolve();
}

function parse_variables(data, frecord, fmodel)
{
   if (data.sectiondef) {
      for(let i = 0; i < data.sectiondef.length; i++) {
         let sectiondef = data.sectiondef[i];
         if (sectiondef.$.kind == "var") {
            frecord.variables = sectiondef.memberdef.map(function(memberDef){
               let attrs = memberDef.$;
               let ret = {
                  name: memberDef.name[0],
                  id: attrs.id,
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
            return fmodel.save(frecord);
         }
      }
   }
   return Promise.resolve();
}

function parse_subnamespaces(data, frecord, fmodel)
{
   if (data.innernamespace && data.innernamespace.length > 0) {
      frecord.namespaces = data.innernamespace.map(function(memberDef){
         let attrs = memberDef.$;
         if (memberDef._ != "std") {
            return {
               name: memberDef._,
               refid: attrs.refid
            };
         }
      });
      return fmodel.save(frecord);
   }
   return Promise.resolve();
}

function parse_classes(data, frecord, fmodel)
{
   if (data.innerclass && data.innerclass.length > 0) {
      frecord.classes = data.innerclass.map(function(memberDef){
         let attrs = memberDef.$;
         return {
            name: memberDef._,
            refid: attrs.refid,
            accessLevel: attrs.prot
         };
      });
      return fmodel.save(frecord);
   }
   return Promise.resolve();
}

function parse_submodules(data, frecord, fmodel)
{
   if (data.innergroup && data.innergroup.length > 0) {
      let ops = [];
      frecord.modules = data.innergroup.map(function(memberDef){
         let attrs = memberDef.$;
         let submodule = fmodel.findOne({
            refid: attrs.refid
         });
         if (submodule) {
            submodule.parent = frecord._id;
         }
         return submodule;
      });
      return fmodel.save(frecord).then(function(){
         return Promise.map(frecord.modules, function(module){
            return fmodel.save(module);
         });
      });
   }
   return Promise.resolve();
}

module.exports = {
   parse_variables: parse_variables,
   parse_definitions: parse_definitions,
   parse_funcs: parse_funcs,
   parse_includes: parse_includes,
   parse_typedefs: parse_typedefs,
   parse_subnamespaces: parse_subnamespaces,
   parse_classes: parse_classes,
   parse_submodules: parse_submodules
};
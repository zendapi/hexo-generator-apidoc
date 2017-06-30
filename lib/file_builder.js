let Promise = require("bluebird");
let fs = require('fs');
let xml2js = require('xml2js');
let Utils = require("./utils");
module.exports = function(hexo)
{
   let fileModel = hexo.model("FileModel");
   let parser = new xml2js.Parser();
   return Promise.map(fileModel.toArray(), function(fileObject){
      let filename = hexo.apigen.xmlDir + "/xml/"+fileObject.refid + ".xml";
      return new Promise(function(resolve, reject){
         fs.readFile(filename, function(err, data)
         {
            if (err) {
               reject(err);
               return;
            }
            resolve(data);
         })
      }).then(function(content){
         parser.parseString(content, function (err, fileJsonData) {
            if (err) {
               reject(err);
               return;
            }
            fileJsonData = fileJsonData.doxygen.compounddef[0];
            return Promise.all([
                  parse_includes(fileJsonData, fileObject, fileModel),
                  parse_definitions(fileJsonData, fileObject, fileModel),
                  parse_typedefs(fileJsonData, fileObject, fileModel),
                  parse_funcs(fileJsonData, fileObject, fileModel),
                  parse_variables(fileJsonData, fileObject, fileModel)
               ]
            );
         });
      });
   });
};

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
            frecord.typedefs = sectiondef.memberdef.map(function(memberDef){
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
                  briefDescription : memberDef.briefdescription[0],
                  detailDescription : memberDef.detaileddescription[0],
                  inbodyDescription : memberDef.inbodydescription[0],
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
            frecord.typedefs = sectiondef.memberdef.map(function(memberDef){
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
                  initializer: memberDef.initializer[0],
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
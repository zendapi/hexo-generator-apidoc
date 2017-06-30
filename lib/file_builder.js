let Promise = require("bluebird");
let fs = require('fs');
let xml2js = require('xml2js');

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
            fileJsonData = fileJsonData.doxygen.compounddef.pop();
            return Promise.all([
                  parse_includes(fileJsonData, fileObject, fileModel),
                  parse_definitions(fileJsonData, fileObject, fileModel),
                  parse_typedefs(fileJsonData, fileObject, fileModel),
                  parse_funcs(fileJsonData, fileObject, fileModel)
               ]
            );
         });
      });
   });
};

function parse_includes(data, frecord, fmodel)
{
   if (data.includes) {
      let files = data.includes.map(function (item)
      {
         let attrs = item.$;
         return {
            path: item._,
            local: attrs.local,
            refid: attrs.refid ? attrs.refid : null
         };
      });
      frecord.includes = files;
      return fmodel.save(frecord);
   }
   return Promise.resolve();
}

function parse_definitions(data, frecord, fmodel)
{
   if (data.sectiondef && (data.sectiondef = data.sectiondef.pop()) && data.sectiondef.$.kind == "define") {
      let defines = data.sectiondef.memberdef.map(function(memberDef){
         let attrs = memberDef.$;
         let ret= {
            name: memberDef.name.pop(),
            refid: attrs.id,
            accessLevel: attrs.prot,
            static: attrs.static == "yes"
         };
         if (memberDef.param && memberDef.param.length > 0) {
            ret.params = memberDef.param.map(function(param){
               if (param.defname) {
                  return param.defname.pop();
               }
            });
            if (ret.params.length == 1 && ret.params[0] == undefined){
               ret.params = [];
            }
         }
         ret.briefDescription = memberDef.briefdescription.pop();
         ret.detailDescription = memberDef.detaileddescription.pop();
         ret.inbodyDescription = memberDef.inbodydescription.pop();
         ret.location = memberDef.location.pop().$;
         return ret;
      });
      frecord.defines = defines;
      return fmodel.save(frecord);
   }
   return Promise.resolve();
}

function parse_typedefs(data, frecord, fmodel)
{
   return Promise.resolve();
}

function parse_funcs(data, frecord, fmodel)
{
   return Promise.resolve();
}
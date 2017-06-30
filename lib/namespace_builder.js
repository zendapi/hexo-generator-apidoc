let Promise = require("bluebird");
let fs = require('fs');
let xml2js = require('xml2js');

module.exports = function(hexo)
{
   let fileModel = hexo.model("NamespaceModel");
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
                  parse_subnamespaces(fileJsonData, fileObject, fileModel),
                  parse_classes(fileJsonData, fileObject, fileModel),
                  parse_typedefs(fileJsonData, fileObject, fileModel),
                  parse_funcs(fileJsonData, fileObject, fileModel),
                  parse_variables(fileJsonData, fileObject, fileModel)
               ]
            );
         });
      });
   });
};

function parse_subnamespaces(data, frecord, fmodel)
{
   if (data.innernamespace && data.innernamespace.length > 0) {
      frecord.namespaces = data.innernamespace.map(function(memberDef){
         let attrs = memberDef.$;
         return {
            name: memberDef._,
            refid: attrs.refid
         };
      });
      return fmodel.save(frecord);
   }
   return Promise.resolve();
}

function parse_classes(data, frecord, fmodel)
{

}

function parse_typedefs(data, frecord, fmodel)
{

}

function parse_variables(data, frecord, fmodel)
{
   
}

function parse_funcs(fileJsonData, fileObject, fileModel)
{
   
}
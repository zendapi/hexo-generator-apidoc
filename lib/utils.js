"use strict";

let _ = require('lodash');
let clone = require("clone");
let fs = require('fs');
let Promise = require("bluebird");
let toString = Object.prototype.toString;

function markdown_link (text, href) {
   return "[" + text + "](" + href + ")";
}

function markdown_escape_row(text) {
   return text.replace(/\s*\|\s*$/, "");
}

function markdown_escape_cell(text)
{
   return text.replace(/^[\n]+|[\n]+$/g, "") // trim CRLF
   .replace("/\|/g", "\\|")                // escape the pipe
   .replace(/\n/g, "<br/>");               // escape CRLF
}

function to_markdown(element, context) {
   let s = "";
   context = context || [];
   switch (typeof element) {
      case "string":
         s = element;
         break;

      case "object":
         if (Array.isArray(element)) {
            element.forEach(function (value, key) {
               s += to_markdown(value, context);
            });
         }
         else {
            for (let key in element) {
               if (element.hasOwnProperty(key)) {
                  let value = element[key];
                  switch (key) {
                     case "ref": return s + markdown_link(to_markdown(value), "#" + value[0].$.refid);
                     case "_": s = element._; break;
                     case "emphasis": s = "*"; break;
                     case "bold": s = "**"; break;
                     case "parametername":
                     case "computeroutput": s = "`"; break;
                     case "parameterlist": s = "\n#### Parameters\n"; break;
                     case "parameteritem": s = "* "; break;
                     case "programlisting": s = "\n```cpp\n"; break;
                     case "itemizedlist": s = "\n\n"; break;
                     case "listitem": s = "* "; break;
                     case "sp": s = " "; break;
                     case "heading": s = "## "; break;
                     case "xrefsect": s += "\n> "; break;
                     case "simplesect":
                        if (element.length > 0) {
                           if (element[0].$.kind == "attention") {
                              s = "> " + to_markdown(element[0], context);
                           }
                           else if (element[0].$.kind == "return") {
                              s = "\n#### Returns\n" + to_markdown(element[0], context);
                           }
                           else if (element[0].$.kind == "see") {
                              s = "\n**See also**: " + to_markdown(element[0], context);
                           }
                           else {
                              console.assert(element[0].$.kind + " not supported.");
                           }
                        }
                        break;

                     case "xreftitle":
                     case "entry":
                     case "row":
                     case "ulink":
                     case "codeline":
                     case "highlight":
                     case "table":
                     case "para":
                        return to_markdown(element[key], context);
                     case "parameterdescription":
                     case "parameternamelist":
                     case "orderedlist":
                     case "blockquote":
                     case "xrefdescription":
                     case "verbatim":
                     case "hruler":
                     case undefined:
                     case "$":
                        break;

                     default:
                        console.error(false, key + ": not yet supported.");
                  }
               }
            }
            // recurse on children elements
            // if (element.$$) {
            //    s += to_markdown(element.$$, context);
            // }

            // closing the element
            // switch (element["#name"]) {
            //    case "parameterlist":
            //    case "para": s += "\n\n"; break;
            //    case "emphasis": s += "*"; break;
            //    case "bold": s += "**"; break;
            //    case "parameteritem": s += "\n"; break;
            //    case "computeroutput": s += "`"; break;
            //    case "parametername": s += "` "; break;
            //    case "entry": s = markdown.escape.cell(s) + "|"; break;
            //    case "programlisting": s += "```\n"; break;
            //    case "codeline": s += "\n"; break;
            //    case "ulink": s = markdown.link(s, element.$.url); break;
            //    case "itemizedlist": s += "\n"; break;
            //    case "listitem": s += "\n"; break;
            //    case "entry": s = " | "; break;
            //    case "xreftitle": s += ": "; break;
            //    case "row":
            //       s = "\n" + markdown.escape.row(s);
            //       if (element.$$ && element.$$[0].$.thead == "yes") {
            //          element.$$.forEach(function (th, i) {
            //             s += (i ? " | " : "\n") + "---------";
            //          });
            //       }
            //       break;
            // }

         }
         break;
      default:
         console.assert(false);
   }

   return s;
}

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
   return url_for.call(context, basePath + "/" + refid + ".html");
}

function url_for_entity_detail(context, containerId, id)
{
   let basePath = context.config.apidoc_path || "api";
   let url_for = context.extend.helper.get('url_for');
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
               if (rentity.isStruct) {
                  mentities[i].isStruct = true;
               }
               if (rentity.isTemplate) {
                  mentities[i].isTemplate = true;
                  mentities[i].templateParams = rentity.templateParams;
               }
            }
         }
      }
   });
}

function fix_object_refs(map, context)
{
   return Promise.mapSeries(_.keys(map), function(file){
      let filename = context.apigen.htmlDir + "/"+file + ".html";
      return new Promise(function(resolve, reject){
         fs.readFile(filename, function(err, data)
         {
            if (err) {
               reject(err);
               return;
            }
            resolve(data);
         });
      }).then(function(content){
         let items = map[file];
         items.map(function (item)
         {
            content = content.toString().replace(/\n/gm, "");
            if ("function" == item.kind) {
               fix_func_object(content, item);
            } else if ("enum" == item.kind) {
               fix_enum_object(content, item);
            }
         });
      });
   });
}

function fix_func_object(content, func)
{
   let fid = func.id.substring(1);// 不知道页面上id为什么少一个1
   let regex = new RegExp("<tr\\s*class\\s*=\\s*[\"']memitem:"+fid+"[\"'](.*?)</tr>", "gm");
   let matches = content.match(regex);
   if (matches && matches.length == 2) {
      // 取第二个
      let trStr = matches[1];
      // 分析第二个
      let signature = trStr.match(new RegExp("(?:<td \\s*class\\s*=\\s*[\"']memTemplItemRight[\"'].*?)>(.*)</td>", "gm"));
      if (signature) {
         signature = signature[0];
         signature = signature.replace(/<td.*?>/g, "").replace(/<\/td>/g, "").replace(fid, "1"+fid)
         .replace(/class=\"el\"/gm, 'class="page-scroll-trigger"');
         func.signature = func.type + " " +signature;
      }
   }
}

function fix_enum_object(content, enumObj)
{
   
   if (enumObj.fixed) {
      return;
   }
   let fid = enumObj.id.substring(1);// 不知道页面上id为什么少一个1
   let regex = new RegExp("<tr\\s*class\\s*=\\s*[\"']memitem:"+fid+"[\"'](.*?)</tr>", "gm");
   let matches = content.match(regex);
   if (matches && matches.length == 1) {
      // 取第二个
      let trStr = matches[0];
      // 分析第二个
      let defStr = trStr.match(new RegExp("(?:<td \\s*class\\s*=\\s*[\"']memItemRight[\"'].*?)>(.*?)</td>", "gm"));
      if (defStr) {
         defStr = defStr[0];
         let strongEnum = defStr.match(/:\s+?(.*?){/gm);
         if (strongEnum) {
            strongEnum = strongEnum[0].replace(/:\s+?/gm, '').replace(/\s+?{/gm, '');
            enumObj.isStrong = true;
            enumObj.tags = ["strong"];
            enumObj.underType = strongEnum;
         }
      }
   }
   enumObj.fixed = true;
}

module.exports = {
   to_markdown: to_markdown,
   find_entry_by_refid: find_entry_by_refid,
   parse_entity_id: parse_entity_id,
   generate_flat_module_list: generate_flat_module_list,
   set_inner_classes: set_inner_classes,
   url_for_api_entity: url_for_api_entity,
   url_for_entity_detail: url_for_entity_detail,
   fix_object_refs: fix_object_refs,
   is_object: function(value)
   {
      return toString.call(value) === '[object Object]';
   },
   is_string: function (value)
   {
      return typeof value === 'string';
   },
   is_boolean: function (value)
   {
      return typeof value === 'boolean';
   },
   is_array: function(value)
   {
      return toString.call(value) == "[object Array]";
   }
};


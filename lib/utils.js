"use strict";

let _ = require('lodash');
let clone = require("clone");

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

function setup_subentity_refs(container, entityType, context)
{
   let mentities = container[entityType];
   let entities = context.doxygen[entityType];
   let mentity;
   let rentity;
   if (mentities.length > 0) {
      for (let i = 0; i < mentities.length; i++) {
         mentity = mentities[i];
         rentity = entities[mentity.refid];
         if (rentity) {
            mentities[i] = rentity;
         }
      }
   }
}

module.exports = {
   to_markdown: to_markdown,
   find_entry_by_refid: find_entry_by_refid,
   parse_entity_id: parse_entity_id,
   generate_flat_module_list: generate_flat_module_list,
   setup_subentity_refs: setup_subentity_refs
};


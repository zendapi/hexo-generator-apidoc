let sax = require("sax");
let Promise = require("bluebird");
let fs = require("fs");
let _ = require('lodash');
let toString = Object.prototype.toString;
let Utils = require("../utils");

function is_array(object)
{
   return toString.call(object) == "[object Array]";
}

function Parser(filename, container)
{
   this.xmlStream = sax.createStream(true);
   this.filename = filename;
   this.container = container;
   this.xmlStream.on("opentag", _.bind(this.opentagHandler, this));
   this.xmlStream.on("closetag", _.bind(this.closetagHandler, this));
   this.xmlStream.on("text", _.bind(this.textHandler, this));
   this.parseContextStack = [];
}

Parser.prototype.getParseContext = function()
{
   return this.parseContextStack[this.parseContextStack.length - 1];
};

Parser.prototype.popParseContext = function()
{
   return this.parseContextStack.pop();
};

Parser.prototype.opentagHandler = function(node)
{
   // 派发事件
   switch (node.name){
      case "compounddef":
         this.beginParse(node);
         break;
      case "innerclass":
      case "innernamespace":
      case "innergroup":
         this.beginInnerRefEntity(node);
         break;
      case "sectiondef":
         let sectionType = node.attributes.kind;
         let propName;
         if (sectionType == "enum") {
            propName = "enums";
         } else if (sectionType == "typedef") {
            propName = "typedefs";
         } else if (sectionType == "var") {
            propName = "variables";
         } else if (sectionType == "func") {
            propName = "funcs";
         } else if (sectionType == "define") {
            propName = "define";
         }
         if (!this.container[propName] || !is_array(this.container[propName])) {
            this.container[propName] = [];
         }
         break;
      case "memberdef":
         if (node.attributes.kind == "enum") {
            this.beginParseEnum(node);
         }
         break;
      case "name":
         this.beginParseName(node);
         break;
      case "enumvalue":
         this.beginParseEnumValue(node);
         break;
      case "briefdescription":
         this.beginParseBrifDesc(node);
         break;
      case "detaileddescription":
         this.beginParseDetailDesc(node);
         break;
   }
};

Parser.prototype.beginParse = function (node)
{
   this.parseContextStack.push({
      node: node,
      type: node.name,
      tagName: node.name,
      targetContainer: this.container,
      parentContext: null
   });
};


Parser.prototype.beginParseBrifDesc = function (node)
{
   this.parseContextStack.push({
      node: node,
      type: node.name,
      tagName: node.name,
      parentContext: this.getParseContext()
   });
};

Parser.prototype.beginParseDetailDesc = function (node)
{
   this.parseContextStack.push({
      node: node,
      type: node.name,
      tagName: node.name,
      parentContext: this.getParseContext()
   });
};

Parser.prototype.beginParseEnumValue = function (node)
{
   let context = {
      node: node,
      type: "enumvalue",
      parentContext: this.getParseContext(),
      tagName: node.name
   };
   let attrs = node.attributes;
   let ids = Utils.parse_entity_id(attrs.id);
   let enumValue = {
      containerId: ids.containerId,
      id: ids.id,
      accessLevel: attrs.prot
   };
   context.targetContainer = enumValue;
   context.parentContext.targetContainer.enumValues.push(enumValue);
   this.parseContextStack.push(context);
};

Parser.prototype.beginParseName = function (node)
{
   this.parseContextStack.push({
      node: node,
      type: "name",
      parentContext: this.getParseContext(),
      tagName: node.name
   });
};

Parser.prototype.beginParseEnum = function(node)
{
   let attrs = node.attributes;
   let ids = Utils.parse_entity_id(attrs.id);
   let enumObj = {
      containerId: ids.containerId,
      id: ids.id,
      accessLevel: attrs.prot,
      isStatic: attrs.static == "yes",
      enumValues: []
   };
   this.parseContextStack.push({
      node: node,
      type: "enum",
      targetContainer: enumObj,
      tagName: node.name
   });
   this.container["enums"].push(enumObj);
};

Parser.prototype.beginInnerRefEntity = function(node)
{
   let propName;
   if (node.name == "innerclass") {
      propName = "classes";
   } else if (node.name == "innernamespace") {
      propName = "namespaces";
   } else if (node.name == "innergroup") {
      propName = "modules";
   }
   
   let parentContext = this.getParseContext();
   let targetContainer = parentContext.targetContainer;
   if (!targetContainer[propName] || !is_array(targetContainer[propName])) {
      targetContainer[propName] = [];
   }
   this.parseContextStack.push({
      type: node.name,
      propName: propName,
      node: node,
      tagName: node.name,
      targetContainer: targetContainer[propName],
      parentContext: parentContext
   });
};

Parser.prototype.closetagHandler = function(tagName)
{
   if (_.indexOf(Parser.SHOULD_POP_TYPES, tagName) != -1) {
      this.popParseContext();
   }
};

Parser.prototype.textHandler = function(text)
{
   let context = this.getParseContext();
   if (context) {
      let parentContext = context.parentContext;
      if (context.type == "innerclass" || context.type == "innernamespace" || context.type == "innergroup") {
         let attrs = context.node.attributes;
         let obj = {
            name: text,
            refid: attrs.refid
         };
         if (attrs.prot) {
            obj.accessLevel = attrs.prot;
         }
         context.targetContainer.push(obj);
      } else if (context.type == "name") {
         if (parentContext) {
            parentContext.targetContainer["name"] = text;
         }
      } else if (context.type == "briefdescription") {
         if (parentContext) {
            parentContext.targetContainer["briefDescription"] = text;
         }
      } else if (context.type == "detaileddescription") {
         if (parentContext) {
            parentContext.targetContainer["detaileDescription"] = text;
         }
      }
   }
};

Parser.prototype.process =  function()
{
   let me = this;
   return new Promise(function (resolve, reject)
   {
      me.xmlStream.on("end", function(){
         resolve();
      });
      me.xmlStream.on("error", function(error){
         reject(error);
      });
      fs.createReadStream(me.filename).pipe(me.xmlStream);
   });
};

Parser.SHOULD_POP_TYPES = [
   "innerclass",
   "innernamespace",
   "innergroup",
   "memberdef",
   "name",
   "enumvalue",
   "briefdescription",
   "detaileddescription"
];

module.exports = Parser;
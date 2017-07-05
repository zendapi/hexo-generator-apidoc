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
         if (this.canParse()) {
            this.beginInnerRefEntity(node);
         }
         break;
      case "sectiondef":
         if (this.canParse()) {
            this.beginParseSection(node);
         }
         break;
      case "memberdef":
         if (this.canParse()) {
            if (node.attributes.kind == "enum") {
               this.beginParseEnum(node);
            }
         }
         break;
      case "name":
         if (this.canParse()) {
            this.beginParseName(node);
         }
         break;
      case "enumvalue":
         if (this.canParse()) {
            this.beginParseEnumValue(node);
         }
         break;
      case "briefdescription":
         if (this.canParse()) {
            this.beginParseBrifDesc(node);
         }
         break;
      case "detaileddescription":
         if (this.canParse()) {
            this.beginParseDetailDesc(node);
         }
         break;
   }
};

Parser.prototype.beginParse = function (node)
{
   this.parseContextStack.push({
      node: node,
      type: node.name,
      tagName: node.name,
      targetContainer: this.container
   });
};

Parser.prototype.beginParseSection = function (node)
{
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
   let context = this.getParseContext();
   let container = context.targetContainer;
   if (!container[propName] || !is_array(container[propName])) {
      container[propName] = [];
   }
   this.parseContextStack.push({
      node: node,
      type: node.name,
      tagName: node.name,
      targetContainer: container[propName]
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
   let context = this.getParseContext();
   this.parseContextStack.push({
      node: node,
      type: "enum",
      targetContainer: enumObj.enumValues,
      tagName: node.name
   });
   context.targetContainer.push(enumObj);
};

Parser.prototype.beginParseEnumValue = function (node)
{
   let attrs = node.attributes;
   let ids = Utils.parse_entity_id(attrs.id);
   let enumValue = {
      containerId: ids.containerId,
      id: ids.id,
      accessLevel: attrs.prot
   };
   let selfContext = {
      node: node,
      type: "enumvalue",
      tagName: node.name,
      targetContainer: enumValue
   };
   let context = this.getParseContext();
   context.targetContainer.push(enumValue);
   this.parseContextStack.push(selfContext);
};

Parser.prototype.beginParseName = function (node)
{
   let context = this.getParseContext();
   this.parseContextStack.push({
      node: node,
      type: "name",
      tagName: node.name,
      targetContainer: context.targetContainer
   });
};

Parser.prototype.beginParseBrifDesc = function (node)
{
   let context = this.getParseContext();
   this.parseContextStack.push({
      node: node,
      type: node.name,
      tagName: node.name,
      targetContainer: context.targetContainer
   });
};

Parser.prototype.beginParseDetailDesc = function (node)
{
   let context = this.getParseContext();
   this.parseContextStack.push({
      node: node,
      type: node.name,
      tagName: node.name,
      targetContainer: context.targetContainer
   });
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
   let context = this.getParseContext();
   let targetContainer = context.targetContainer;
   if (!targetContainer[propName] || !is_array(targetContainer[propName])) {
      targetContainer[propName] = [];
   }
   this.parseContextStack.push({
      type: node.name,
      propName: propName,
      node: node,
      tagName: node.name,
      targetContainer: targetContainer[propName]
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
         context.targetContainer["name"] = text;
      } else if (context.type == "briefdescription") {
         context.targetContainer["briefDescription"] = text;
      } else if (context.type == "detaileddescription") {
         context.targetContainer["detaileDescription"] = text;
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

Parser.prototype.canParse = function()
{
   return this.parseContextStack.length > 0;
};

Parser.SHOULD_POP_TYPES = [
   "compounddef",
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
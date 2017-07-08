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

function Parser(filename, container, context)
{
   this.xmlStream = sax.createStream(true);
   this.filename = filename;
   this.container = container;
   this.register = context.doxygen;
   this.xmlStream.on("opentag", _.bind(this.opentagHandler, this));
   this.xmlStream.on("closetag", _.bind(this.closetagHandler, this));
   this.xmlStream.on("text", _.bind(this.textHandler, this));
   this.parseContextStack = [];
   this.hexo = context;
}

Parser.SIMPLE_VALUES_TAGS = [
   "name",
   "definition",
   "argsstring",
   "declname",
   "defname"
];

// Parser.REF_TPL = '<a href = "{url}" class="{cls}">{name}</a>';
Parser.REF_TPL = '<a href = "{url}" ">{name}</a>';

Parser.prototype = {

   popParseContext: function()
   {
      return this.parseContextStack.pop();
   },

   getParseContext: function()
   {
      return this.parseContextStack[this.parseContextStack.length - 1];
   },

   beginParseSimpleValueTag: function (node)
   {
      let context = this.getParseContext();
      this.parseContextStack.push({
         tagName: node.name,
         targetContainer: context.targetContainer
      });
   },

   beginParseCompounddef: function(node)
   {
      this.parseContextStack.push({
         node: node,
         tagName: node.name,
         targetContainer: this.container
      });
   },

   beginParseInnerclass: function (node)
   {
      let context = this.getParseContext();
      let targetContainer = context.targetContainer;
      let attrs = node.attributes;
      let cls = {
         refid: attrs.refid,
         accessLevel: attrs.prot
      };
      targetContainer.classes.push(cls);
      this.parseContextStack.push({
         node: node,
         tagName: node.name,
         targetContainer: cls
      });
   },

   beginParseInnernamespace: function (node)
   {
      let context = this.getParseContext();
      let targetContainer = context.targetContainer;
      let attrs = node.attributes;
      let namespace = Utils.find_entry_by_refid(this.register.namespaces, attrs.refid);
      targetContainer.namespaces.push(namespace);
      this.parseContextStack.push({
         node: node,
         tagName: node.name,
         targetContainer: namespace
      });
   },

   beginParseInnergroup: function (node)
   {
      let context = this.getParseContext();
      let targetContainer = context.targetContainer;
      let attrs = node.attributes;
      let module = Utils.find_entry_by_refid(this.register.modules, attrs.refid);
      module.parent = targetContainer.refid;
      targetContainer.modules.push(module);
      this.parseContextStack.push({
         node: node,
         tagName: node.name,
         targetContainer: module
      });
   },

   beginParseSectiondef: function(node)
   {
      let attrs = node.attributes;
      let kind = attrs.kind;
      let propName;
      if(kind == "enum") {
         propName = "enums";
      } else if (kind == "typedef") {
         propName = "typedefs";
      } else if (kind == "var") {
         propName = "variables";
      } else if (kind == "func") {
         propName = "funcs";
      } else if (kind == "define") {
         propName = "defines";
      } else if (kind == "private-attrib") {
         propName = "privateAttributes";
      } else if (kind == "protected-attrib") {
         propName = "protectedAttributes";
      } else if (kind == "public-attrib") {
         propName = "publicAttributes";
      } else if (kind == "private-func") {
         propName = "privateFuncs";
      } else if (kind == "protected-func") {
         propName = "protectedFuncs";
      } else if (kind == "public-func") {
         propName = "publicFuncs";
      } else if (kind == "private-type") {
         propName = "privateTypes";
      } else if (kind == "protected-type") {
         propName = "protectedTypes";
      } else if (kind == "public-type") {
         propName = "publicTypes";
      } else if (kind == "friend") {
         propName = "friends";
      }
      let section = [];
      let context = this.getParseContext();
      context.targetContainer[propName] = section;
      let parentNodeAttrs = context.node.attributes;
      this.parseContextStack.push({
         node: node,
         tagName: node.name,
         containerRef: {
            id: parentNodeAttrs.id,
            kind: parentNodeAttrs.kind,
            url: Utils.url_for_api_entity(this.hexo, parentNodeAttrs.id)
         },
         targetContainer: section
      });
   },

   beginParseMemberdef: function (node)
   {
      let attrs = node.attributes;
      let ids = Utils.parse_entity_id(attrs.id);
      let targetContainer = {
         containerId: ids.containerId,
         id: ids.id,
         accessLevel: attrs.prot,
         isStatic: attrs.static == "yes"
      };
      let menberKind = node.attributes.kind;
      if ("variable" == menberKind) {
         targetContainer.mutable = attrs.mutable == "yes";
      } else if ("function" == menberKind) {
         targetContainer.isConst = attrs.const == "yes";
         targetContainer.isExplict = attrs.explicit == "yes";
         targetContainer.isInline = attrs.inline == "yes";
         targetContainer.isVirtual = attrs.virt != "non-virtual";
      }
      let context = this.getParseContext();
      if ("varibale" == menberKind ||
         "function" == menberKind ||
         "enum" == menberKind ||
         "variable" == menberKind ||
         "typedef" == menberKind ||
         "define" == menberKind

      ) {
         targetContainer.containerRef = context.containerRef;
      }
      this.parseContextStack.push({
         node: node,
         targetContainer: targetContainer,
         tagName: node.name
      });
      context.targetContainer.push(targetContainer);
   },

   endParseMemberdef: function (tagName)
   {
      let context = this.getParseContext();
      let node = context.node;
      let menberKind = node.attributes.kind;
      if (menberKind == "function") {
         let func = context.targetContainer;
         let name = Parser.REF_TPL.replace(/\{url\}/g, Utils.url_for_entity_detail(this.hexo, func.containerId, func.id)).
         replace("{name}", func.name);
         let paramsStr = [];
         if (func.params) {
            func.params.map(function(param) {
               let itemStr = param.type;
               if (param.declname) {
                  itemStr += " " + param.declname;
               }
               if (param.defValue) {
                  itemStr += " = " + param.declname;
               }
               paramsStr.push(itemStr);
            });
         }
         paramsStr = paramsStr.join(", ");
         func.paramsStr = paramsStr;
         func.signature = func.type + " " + name + " ( " + paramsStr + " )";
         if (func.isStatic) {
            func.signature = "static " + func.signature;
         }
         if (func.isConst) {
            func.signature += " const";
         }
         func.isConstExpr = func.definition.indexOf("constexpr") != -1;
      } else if (menberKind == "variable") {
         let variable = context.targetContainer;
         let name = Parser.REF_TPL.replace(/\{url\}/g, Utils.url_for_entity_detail(this.hexo, variable.containerId, variable.id)).
         replace("{name}", variable.name);
         variable.defineStr = variable.type + " " + name;
         if (variable.initializer) {
            variable.defineStr += " " + variable.initializer;
         }
      }
   },

   beginParseEnumvalue: function (node)
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
         tagName: node.name,
         targetContainer: enumValue
      };
      let context = this.getParseContext();
      let targetContainer = context.targetContainer;
      if (!targetContainer.enumValues || !is_array(targetContainer.enumValues)) {
         targetContainer.enumValues = [];
      }
      targetContainer.enumValues.push(enumValue);
      this.parseContextStack.push(selfContext);
   },

   beginParseLocation: function (node)
   {
      let context = this.getParseContext();
      context.targetContainer.location = node.attributes;
   },

   beginParseBriefdescription: function (node)
   {
      let context = this.getParseContext();
      this.parseContextStack.push({
         node: node,
         tagName: node.name,
         targetContainer: context.targetContainer,
         markdown: ""
      });
   },

   endParseBriefdescription: function (tagName)
   {
      let context = this.getParseContext();
      context.targetContainer.briefDescription = _.trim(context.markdown);
   },

   beginParseDetaileddescription: function (node)
   {
      let context = this.getParseContext();
      this.parseContextStack.push({
         node: node,
         tagName: node.name,
         targetContainer: context.targetContainer,
         markdown: ""
      });
   },

   endParseDetaileddescription: function (tagName)
   {
      let context = this.getParseContext();
      context.targetContainer.detailDescription = _.trim(context.markdown);
   },

   beginParseDefinition: function (node)
   {
      let context = this.getParseContext();
      this.parseContextStack.push({
         tagName: node.name,
         targetContainer: context.targetContainer
      });
   },

   beginParseTemplateparamlist: function (node)
   {
      let context = this.getParseContext();
      let tplParams = [];
      context.targetContainer.templateParams = tplParams;
      context.targetContainer.isTemplate = true;
      this.parseContextStack.push({
         node: node,
         tagName: node.name,
         targetContainer: tplParams
      });
   },

   beginParseParam: function (node)
   {
      let context = this.getParseContext();
      let targetContainer = context.targetContainer;
      let targetArray;
      if (context.tagName != "templateparamlist") {
         if (!targetContainer.params || !is_array(targetContainer.params)) {
            targetContainer.params = [];
         }
         targetArray = targetContainer.params;
      } else {
         targetArray = targetContainer;
      }
      let param = {};
      targetArray.push(param);
      this.parseContextStack.push({
         node: node,
         tagName: node.name,
         targetContainer: param
      });
   },

   beginParseType: function (node)
   {
      let context = this.getParseContext();
      this.parseContextStack.push({
         node: node,
         tagName: node.name,
         targetContainer: context.targetContainer,
         typeString: "",
         attachProp: "typeString"
      });
   },

   notifyTypeText: function (text)
   {
      let context = this.getParseContext();
      context.typeString += text;
   },

   endParseType: function (tagName)
   {
      let context = this.getParseContext();
      context.targetContainer.type = context.typeString;
      if (context.refs) {
         context.targetContainer.refs = context.refs;
      }
   },

   beginParseDefval: function (node)
   {
      let context = this.getParseContext();
      this.parseContextStack.push({
         node: node,
         tagName: node.name,
         targetContainer: context.targetContainer,
         defValueString: "",
         attachProp: "defValueString"
      });
   },

   notifyDefvalText: function (text)
   {
      let context = this.getParseContext();
      context.defValueString += text;
   },

   endParseDefval: function (tagName)
   {
      let context = this.getParseContext();
      context.targetContainer.defValue = context.defValueString;
   },

   beginParseInitializer: function (node)
   {
      let context = this.getParseContext();
      this.parseContextStack.push({
         node: node,
         tagName: node.name,
         targetContainer: context.targetContainer,
         initializerString: "",
         attachProp: "initializerString"
      });
   },

   notifyInitializerText: function (text)
   {
      let context = this.getParseContext();
      context.initializerString += text;
   },

   endParseInitializer: function (tagName)
   {
      let context = this.getParseContext();
      context.targetContainer.initializer = context.initializerString;
   },

   beginParseRef: function(node)
   {
      let context = this.getParseContext();
      let tagName = context.tagName;
      // 检查上下文
      if (tagName != "type" && tagName != "defval" && tagName != "initializer") {
         return;
      }
      let attrs = node.attributes;
      let ref = {};
      if (attrs.kindref == "member") {
         let ids = Utils.parse_entity_id(attrs.refid);
         ref.containerId = ids.containerId;
         ref.id = ids.id
      } else {
         ref.refid = attrs.refid;
      }
      if (attrs.kindref) {
         ref.kindref = attrs.kindref;
      }
      this.parseContextStack.push({
         node: node,
         tagName: node.name,
         targetContainer: ref,
         attachProp: context.attachProp,
         parentContext: context
      });
   },

   notifyRefText: function(text)
   {
      let context = this.getParseContext();
      context.targetContainer.name = text;
   },

   endParseRef: function (tagName)
   {
      let context = this.getParseContext();
      // 检查上下文 上面可能山下文不合适没有压栈
      if (context.tagName != "ref") {
         return true;
      }
      let attrs = context.node.attributes;
      let parentContext = context.parentContext;
      let targetContainer = context.targetContainer;
      let attachProp = context.attachProp;
      let refStr;
      if (attrs.kindref == "member") {
         refStr = Parser.REF_TPL.replace("{url}", Utils.url_for_entity_detail(this.hexo, targetContainer.containerId, targetContainer.id)).
         replace("{name}", targetContainer.name);
      } else {
         refStr = Parser.REF_TPL.replace("{url}", Utils.url_for_api_entity(this.hexo, targetContainer.refid)).
         replace("{name}", targetContainer.name);
      }
      parentContext[attachProp] += refStr;
      if (!parentContext.refs || !is_array(parentContext.refs)) {
         parentContext.refs = [];
      }
      parentContext.refs.push(targetContainer)
   },

   // markdown
   beginParsePara: function (node)
   {
      let context = this.getParseContext();
      let markdown = context.markdown;
      markdown += "\n";
      context.markdown = markdown;
   },

   endParsePara: function (tagName)
   {
      let context = this.getParseContext();
      let markdown = context.markdown;
      markdown += "\n";
      context.markdown = markdown;
   },

   opentagHandler: function(node)
   {
      // 派发事件
      let tagName = node.name;
      let beginMethodName = "beginParse"+_.capitalize(tagName);
      if (this[beginMethodName]) {
         if (tagName == "compounddef") {
            this[beginMethodName](node);
         } else {
            if (this.canParse()) {
               this[beginMethodName](node);
            }
         }
      } else {
         // 判断是否在simpleValue 里面
         if (_.indexOf(Parser.SIMPLE_VALUES_TAGS, tagName) != -1) {
            this.beginParseSimpleValueTag(node);
         }
      }
   },

   closetagHandler: function(tagName)
   {
      let endMethodName = "endParse"+_.capitalize(tagName);
      if (this[endMethodName]) {
         if(this[endMethodName](tagName)) {
            return;
         }
      }
      let context = this.getParseContext();
      if (context && context.tagName == tagName) {
         this.popParseContext();
      }
   },

   textHandler: function(text)
   {
      let context = this.getParseContext();
      if (context) {
         let tagName = context.tagName;
         // text 拦截器
         let notifyTextHandler = "notify"+_.capitalize(tagName)+"Text";
         if (this[notifyTextHandler] && this[notifyTextHandler](text)) {
            return;
         }
         if (tagName == "innerclass" ||
            tagName == "innernamespace" ||
            tagName == "innergroup") {
            context.targetContainer.name = text;
         } else if (_.indexOf(Parser.SIMPLE_VALUES_TAGS, tagName) != -1) {
            context.targetContainer[tagName] = text;
         } else if (tagName == "briefdescription") {
            context.markdown += text;
         } else if (tagName == "detaileddescription") {
            context.markdown += text;
         }
      }
   },

   process: function()
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
   },
   canParse: function()
   {
      return this.parseContextStack.length > 0;
   }
};


module.exports = Parser;
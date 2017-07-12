let sax = require("sax");
let Promise = require("bluebird");
let fs = require("fs");
let _ = require('lodash');
let toString = Object.prototype.toString;
let Utils = require("../utils");
let pathFn = require('path');

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
   this.valueItemRepo = this.register.valueItemRepo;
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
   "defname",
   "scope"
];

// Parser.REF_TPL = '<a href = "{url}" class="{cls}">{name}</a>';
Parser.REF_TPL = '<a href = "{url}">{name}</a>';

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

   beginParseCompound: function (node)
   {
      let attrs = node.attributes;
      let kind = attrs.kind;
      let mname;
      if (kind == "class" || kind == "struct") {
         mname = "classes";
      } else if (kind == "namespace") {
         mname = "namespaces";
      } else if (kind == "file") {
         mname = "files";
      } else if (kind == "group") {
         mname = "modules";
      }
      let data = {
         refid: attrs.refid,
         kind: attrs.kind,
         variables: [],
         defines: [],
         typedefs: [],
         namespaces: [],
         enums:[],
         classes: [],
         funcs: [],
         modules: []
      };
      if (kind == "struct") {
         data.isStruct = true;
      }
      if (mname && !this.container[mname]) {
         this.container[mname] = {};
      }
      this.parseContextStack.push({
         node: node,
         tagName: node.name,
         targetContainer: data,
         mname: mname
      });
   },

   beginParseMember: function (node)
   {
      this.parseContextStack.push({
         node: node,
         tagName: node.name,
         targetContainer: {}
      });
   },

   endParseCompound: function (tagName)
   {
      let contex = this.getParseContext();
      let node = contex.node;
      let targetContainer = contex.targetContainer;
      let attrs = node.attributes;
      let kind = attrs.kind;
      let name = targetContainer.name;
      let ext = pathFn.extname(name);
      let mname = contex.mname;
      if (mname) {
         if ((kind != "namespace") || ("std" != name && name.indexOf("@") == -1)) {
            if (mname != "files" || ext == ".h") {
               this.container[mname][attrs.refid] = targetContainer;
            }
         }
         if (kind == "class" || kind == "struct") {
            this.container.classNameToIdMap[name.replace(/\s/g, "")] = attrs.refid;
         }
      }
   },

   beginParseCompounddef: function(node)
   {
      this.parseContextStack.push({
         node: node,
         tagName: node.name,
         targetContainer: this.container
      });
   },

   endParseCompounddef: function (tagName)
   {
      let context = this.getParseContext();
      let targetContaner = context.targetContainer;
      let node = context.node;
      let attrs = node.attributes;
      if ("class" == attrs.kind || "struct" == attrs.kind) {

         let cls = targetContaner;
         let fullName = cls.name;
         let parts = fullName.split("::");
         cls.simpleName = parts.pop();
         cls.url = Utils.url_for_api_entity(this.hexo, cls.refid);
         cls.tags = [];
         if (cls.isTemplate) {
            cls.tags.push("template");
         }
         if (cls.isTemplate) {
            cls.tplParamsString = [];
            cls.templateParams.map(function(param){
               let itemStr = param.type;
               if (param.defname) {
                  itemStr += " " + param.defname;
               }
               if (param.defValue) {
                  itemStr += " = " + param.defValue;
               }
               cls.tplParamsString.push(itemStr);
            });
            cls.tplParamsString = cls.tplParamsString.join(", ");
         }
      }
   },

   beginParseCompoundname: function (node)
   {
      this.parseContextStack.push({
         node: node,
         tagName: node.name,
         targetContainer: this.container
      });
   },

   notifyCompoundnameText: function (text)
   {
      let context = this.getParseContext();
      context.targetContainer.name = text;
   },

   // 解析类的时候的干扰标签，会干扰name
   beginParseListofallmembers: function (node)
   {
      this.parseContextStack.push({
         node: node,
         tagName: node.name,
         targetContainer: {} // 只是为了废弃
      });
   },

   beginParseInnerclass: function (node)
   {
      let context = this.getParseContext();
      let targetContainer = context.targetContainer;
      let attrs = node.attributes;
      let cls = {
         refid: attrs.refid,
         accessLevel: attrs.prot,
         url: Utils.url_for_api_entity(this.hexo, attrs.refid)
      };
      targetContainer.classes.push(cls);
      this.parseContextStack.push({
         node: node,
         tagName: node.name,
         targetContainer: cls
      });
   },

   endParseInnerclass: function (tagName)
   {
      let context = this.getParseContext();
      let targetContainer = context.targetContainer;
      if (this.container.kind == "namespace") {
         targetContainer.simpleName = targetContainer.name.replace(this.container.name+"::", '');
      }
   },

   beginParseIncludes: function(node)
   {
      let context = this.getParseContext();
      let targetContainer = context.targetContainer;
      let attrs = node.attributes;
      if (!targetContainer.includes) {
         targetContainer.includes = [];
      }
      let include = {
         local: attrs.local == "yes",
      };
      if (attrs.refid) {
         include.refid = attrs.refid;
      }
      targetContainer.includes.push(include);
      this.parseContextStack.push({
         node: node,
         tagName: node.name,
         targetContainer: include
      });
   },

   notifyIncludesText: function (text)
   {
      let context = this.getParseContext();
      context.targetContainer.name = text;
   },


   beginParseBasecompoundref: function(node)
   {
      let context = this.getParseContext();
      let targetContainer = context.targetContainer;
      let attrs = node.attributes;
      if (!targetContainer.baseClasses) {
         targetContainer.baseClasses = [];
      }
      let baseClass = {
         accessLevel: attrs.prot,
         isVirtual: attrs.virt == "non-virtual",
         refid: attrs.refid,
         url: Utils.url_for_api_entity(this.hexo, attrs.refid),
         tags: []
      };
      baseClass.tags.push(baseClass.accessLevel);
      if (baseClass.isVirtual) {
         baseClass.tags.push("virtual");
      }
      targetContainer.baseClasses.push(baseClass);
      this.parseContextStack.push({
         node: node,
         tagName: node.name,
         targetContainer: baseClass
      });
   },

   notifyBasecompoundrefText: function (text)
   {
      let context = this.getParseContext();
      context.targetContainer.name = text;
   },

   beginParseInnernamespace: function(node)
   {
      let context = this.getParseContext();
      let targetContainer = context.targetContainer;
      let attrs = node.attributes;
      let parentNode = context.node;
      let parentAttrs = parentNode.attributes;
      let namespace = Utils.find_entry_by_refid(this.register.namespaces, attrs.refid);
      if (parentAttrs.kind == "namespace") {
         namespace.parent = parentAttrs.id;
      }
      namespace.url = Utils.url_for_api_entity(this.hexo, attrs.refid);
      targetContainer.namespaces.push(namespace);
      this.parseContextStack.push({
         node: node,
         tagName: node.name,
         targetContainer: namespace
      });
   },

   endParseInnernamespace: function (tagName)
   {
      let context = this.getParseContext();
      let targetContainer = context.targetContainer;
      if (this.container.kind == "namespace") {
         targetContainer.simpleName = targetContainer.name.replace(this.container.name+"::", '');
      }
   },

   beginParseInnergroup: function (node)
   {
      let context = this.getParseContext();
      let targetContainer = context.targetContainer;
      let attrs = node.attributes;
      let module = Utils.find_entry_by_refid(this.register.modules, attrs.refid);
      module.url = Utils.url_for_api_entity(this.hexo, attrs.refid);
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
      } else if (kind == "protected-static-attrib") {
         propName = "protectedStaticAttributes";
      } else if (kind == "public-attrib") {
         propName = "publicAttributes";
      } else if (kind == "public-static-attrib"){
         propName = "publicStaticAttributes";
      } else if (kind == "private-func") {
         propName = "privateFuncs";
      } else if (kind == "protected-func") {
         propName = "protectedFuncs";
      } else if (kind == "protected-static-func") {
         propName = "protectedStaticFuncs";
      } else if (kind == "public-func") {
         propName = "publicFuncs";
      } else if (kind == "public-static-func") {
         propName = "publicStaticFuncs";
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
      let targetItem = this.valueItemRepo[attrs.id];
      let context = this.getParseContext();
      if (!targetItem) {
         targetItem = {
            containerId: ids.containerId,
            id: ids.id,
            accessLevel: attrs.prot,
            isStatic: attrs.static == "yes"
         };
         let memberKind = node.attributes.kind;
         if ("variable" == memberKind) {
            targetItem.mutable = attrs.mutable == "yes";
         } else if ("function" == memberKind || "friend") {
            targetItem.isConst = attrs.const == "yes";
            targetItem.isExplict = attrs.explicit == "yes";
            targetItem.isInline = attrs.inline == "yes";
            targetItem.isVirtual = attrs.virt != "non-virtual";
         }
         if ("varibale" == memberKind ||
            "function" == memberKind ||
            "enum" == memberKind ||
            "variable" == memberKind ||
            "typedef" == memberKind ||
            "define" == memberKind
         ) {
            targetItem.containerRef = context.containerRef;
         }
         targetItem.kind = memberKind;
         this.valueItemRepo[attrs.id] = targetItem;
      }
      this.parseContextStack.push({
         node: node,
         targetContainer: targetItem,
         tagName: node.name
      });
      context.targetContainer.push(targetItem);
   },

   endParseMemberdef: function (tagName)
   {
      let context = this.getParseContext();
      let node = context.node;
      let memberKind = node.attributes.kind;
      let targetContainer = context.targetContainer;
      if (this.container.kind == "namespace" || this.container.kind == "class" || this.container.kind == "struct") {
         // 处理名称，在名称空间下添加的都得加上
         if ("variable" == memberKind || "enum" == memberKind || "typedef" == memberKind || "function" == memberKind) {
            targetContainer.simpleName = targetContainer.name;
            targetContainer.name = this.container.name + "::" + targetContainer.name;
         }
      }
      if (memberKind == "function") {
         let func = targetContainer;
         let name = '<a href = "{url}" class="page-scroll-trigger">{name}</a>'.replace(/\{url\}/g, Utils.url_for_entity_detail(this.hexo, func.containerId, func.id)).
         replace("{name}", func.name);
         let simpleName;
         if (targetContainer.simpleName) {
            simpleName = '<a href = "{url}" class="page-scroll-trigger">{name}</a>'.replace(/\{url\}/g, Utils.url_for_entity_detail(this.hexo, func.containerId, func.id)).
            replace("{name}", func.simpleName);
         }
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
         func.signature = func.type + " " + name + " ( " + paramsStr + " ) ";
         if (simpleName) {
            func.simpleSignature = func.type + " " + simpleName + " ( " + paramsStr + " ) ";
         }
         if (func.isStatic) {
            func.signature = "static " + func.signature;
            if (simpleName) {
               func.simpleSignature = "static " + func.simpleSignature;
            }
         }
         if (func.isConst) {
            func.signature += " const";
            if (simpleName) {
               func.simpleSignature += " const";
            }
         }
         func.isConstExpr = func.definition.indexOf("constexpr") != -1;
         // 设置模板参数
         func.url = Utils.url_for_entity_detail(this.hexo, func.containerId, func.id);
         func.tags = [];
         if (func.isTemplate) {
            func.tplParamsString = [];
            func.templateParams.map(function(param){
               if (param.defValue) {
                  func.tplParamsString.push(param.type + " = " + param.defValue);
               } else {
                  func.tplParamsString.push(param.type);
               }
            });
            func.tplParamsString = func.tplParamsString.join(", ");
            func.tplParamsString = func.tplParamsString.replace(/\{cls\}/g, "");
         }
         if (func.isTemplate) {
            func.tags.push("template");
         }
         if (func.isStatic) {
            func.tags.push("static");
         }
         if (func.isConst) {
            func.tags.push("const");
         }
         if (func.isInline) {
            func.tags.push("inline");
         }
         if (func.isConstExpr) {
            func.tags.push("constexpr");
         }
         // 判断是否是构造函数或者析构函数
         if (this.container.kind == "class") {
            let clsName = this.container.name;
            let constructorName = clsName.split("::").pop();
            let desctructorName = '~'+constructorName;
            let methodName = func.simpleName;

            if (methodName == constructorName) {
               func.isConstructor = true;
            }
            if (methodName == desctructorName) {
               func.isDesctructor = true;
            }
            // 加入protected tag
            // if (func.accessLevel == "protected") {
            func.tags.push(func.accessLevel);
            // }
         }

      } else if (memberKind == "variable") {
         let variable = targetContainer;
         variable.tags = [];
         let name = '<a href = "{url}" class="page-scroll-trigger">{name}</a>'.replace(/\{url\}/g, Utils.url_for_entity_detail(this.hexo, variable.containerId, variable.id)).
         replace("{name}", variable.name);
         let simpleName;
         if (targetContainer.simpleName) {
            simpleName = '<a href = "{url}" class="page-scroll-trigger">{name}</a>'.replace(/\{url\}/g, Utils.url_for_entity_detail(this.hexo, variable.containerId, variable.id)).
            replace("{name}", variable.simpleName);
         }
         variable.defineStr = variable.type + " " + name;
         if (simpleName) {
            variable.simpleDefineStr = variable.type + " " + simpleName;
         }
         if (variable.initializer) {
            variable.defineStr += " " + variable.initializer;
            if (simpleName) {
               variable.simpleDefineStr += " " + variable.initializer;
            }
         }
         if (variable.isStatic) {
            variable.tags.push("static");
         }
         if (variable.isConst) {
            variable.tags.push("const");
         }
      } else if (memberKind == "typedef") {
         let hexo = this.hexo;
         let typedef = targetContainer;
         typedef.url = Utils.url_for_entity_detail(hexo, typedef.containerId, typedef.id);
         typedef.definition = typedef.definition.replace('<', "&lt;").replace('>', "&gt;");
         if (typedef.definition.indexOf("using ") != -1) {
            typedef.definition = typedef.definition.replace("typedef ", '');
         }
         typedef.rawDefinition = typedef.definition;
         typedef.definitionWithoutSelfLink = typedef.rawDefinition;
         // typedef.simpleDefinitionWithoutSelfLink = typedef.rawDefinition.replace(this.container.name+"::", '');
         if (typedef.simpleName) {
            typedef.simpleDefinition = typedef.definition.replace(typedef.name,
               "<a href='"+typedef.url+"' class='page-scroll-trigger'>"+typedef.simpleName+"</a>");
         }
         typedef.definition = typedef.definition.replace(typedef.name,
            "<a href='"+typedef.url+"' class='page-scroll-trigger'>"+typedef.name+"</a>");
         // 替换type
         if (typedef.refs && Utils.is_array(typedef.refs)) {
            typedef.refs.map(function(item){
               if (item.kindref == "member") {
                  item.url = Utils.url_for_entity_detail(hexo, item.containerId, item.id)
               } else {
                  item.url = Utils.url_for_api_entity(hexo, item.refid);
               }
               typedef.definition = typedef.definition.replace(item.name,
                  "<a href='"+item.url+"'>"+item.name+"</a>");
               if (typedef.simpleName) {
                  typedef.simpleDefinition = typedef.simpleDefinition.replace(item.name,
                     "<a href='"+item.url+"'>"+item.name+"</a>");
                  // typedef.simpleDefinitionWithoutSelfLink = typedef.simpleDefinitionWithoutSelfLink.replace(item.name,
                  //    "<a href='"+item.url+"'>"+item.name+"</a>");
               }

               typedef.definitionWithoutSelfLink = typedef.definitionWithoutSelfLink.replace(item.name,
                  "<a href='"+item.url+"'>"+item.name+"</a>");

            });
         }
      }  else if (memberKind == "define") {
         let macro = targetContainer;
         macro.url = Utils.url_for_entity_detail(this.hexo, macro.containerId, macro.id);
         if (macro.params) {
            macro.paramsString = [];
            macro.params.map(function (param)
            {
               macro.paramsString.push(param.defname);
            });
            macro.paramsString = macro.paramsString.join(", ");
         }
      } else if (memberKind == "enum") {
         let enumValue = targetContainer;
         enumValue.url = Utils.url_for_entity_detail(this.hexo, enumValue.containerId, enumValue.id);
      } else if (memberKind == "friend") {
         let friend = targetContainer;
         friend.tags = [];
         // 分析类型
         let typeStr = friend.type;
         let friendType;
         let defineStr = typeStr.replace("friend ", "");
         let infoDefineStr = defineStr;
         if (typeStr.indexOf("friend class") != -1) {
            friendType = "class";
         } else {
            friendType = "function";
         }
         friend.friendType = friendType;
         if (friend.isTemplate) {
            friend.tags.push("template");
         }
         friend.url = Utils.url_for_entity_detail(this.hexo, friend.containerId, friend.id);
         defineStr += "&nbsp;<a href='"+friend.url+"' class='page-scroll-trigger'>"+friend.name+"</a>";
         infoDefineStr += "&nbsp;"+friend.name;
         if (friendType == "function") {
            let paramsStr = [];
            if (friend.params) {
               friend.params.map(function(param) {
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
            friend.paramsStr = paramsStr;
            defineStr += "("+paramsStr +")";
            infoDefineStr += "("+paramsStr +")";
            if (friend.isTemplate) {
               friend.tplParamsString = [];
               friend.templateParams.map(function(param){
                  if (param.defValue) {
                     friend.tplParamsString.push(param.type + " = " + param.defValue);
                  } else {
                     friend.tplParamsString.push(param.type);
                  }
               });
               friend.tplParamsString = friend.tplParamsString.join(", ");
               friend.tplParamsString = friend.tplParamsString.replace(/\{cls\}/g, "");
            }
            if (friend.isTemplate) {
               friend.tags.push("template");
            }
            if (friend.isStatic) {
               friend.tags.push("static");
            }
            if (friend.isConst) {
               friend.tags.push("const");
            }
            if (friend.isInline) {
               friend.tags.push("inline");
            }
            if (friend.isConstExpr) {
               friend.tags.push("constexpr");
            }
         } else if (friendType == "class") {
            // 扫描class的名称
            let infoDefineStr = typeStr;
            if (friend.definition.indexOf("friend class") == -1) {
               // 正常不需要探测
               infoDefineStr += " " +friend.definition;
            } else {
               infoDefineStr = "";
               friend.needDetectHtml = true;
            }
         }
         friend.defineStr = defineStr;
         friend.infoDefineStr = infoDefineStr;
      }
   },

   beginParseEnumvalue: function (node)
   {
      let attrs = node.attributes;
      let ids = Utils.parse_entity_id(attrs.id);
      let enumValue = {
         containerId: ids.containerId,
         id: ids.id,
         accessLevel: attrs.prot,
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
         targetContainer: tplParams,
         parentContaner: context.targetContainer
      });
   },

   endParseTemplateparamlist: function (tagName)
   {
      let context = this.getParseContext();
      if (context.parentContaner.isTemplate && context.parentContaner.templateParams.length == 0) {
         context.parentContaner.isTemplate = false;
      }
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
         if (tagName == "compounddef" || tagName == "compound") {
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
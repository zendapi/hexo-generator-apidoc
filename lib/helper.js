module.exports = function (hexo)
{
   hexo.extend.helper.register("url_for_api_entity", function(refid)
   {
      let basePath = hexo.config.apidoc_path || "api";
      let url_for = hexo.extend.helper.get('url_for');
      return url_for.call(hexo, basePath + "/" + refid + ".html");
   });
};
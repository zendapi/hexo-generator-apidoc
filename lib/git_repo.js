'use strict';

let Git = require("nodegit");
let Promise = require('bluebird');

let repoDir;
let repoRef;
let repoStashName;
function set_config(dir, ref, stashName)
{
   repoDir = dir;
   repoRef = ref;
   repoStashName = stashName;
}

function prepare(hexo)
{
   return Git.Repository.open(repoDir).then(function(repo){
      return repo.getStatus().then(function(statusArray){
         if (statusArray.length != 0) {
            return Git.Stash.save(repo, Git.Signature.default(repo), repoStashName, Git.Stash.FLAGS.INCLUDE_UNTRACKED)
            .then(function(oid) {
               hexo.apigen.stashid = oid.tostrS();
               return repo.checkoutBranch(repoRef);
            }).then(function() {
               return Promise.resolve();
            }).catch(function(error){
               throw error;
            });
         }else {
            return repo.checkoutBranch(repoRef).then(function(){
               return Promise.resolve();
            }).catch(function(error){
               throw error;
            });
         }
      }).catch(function(error){
         throw error;
      });
   });
}

function restore()
{

}

module.exports = {
   setConfig: set_config,
   prepare: prepare,
   restore: restore
};
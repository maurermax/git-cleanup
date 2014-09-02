#!/usr/bin/env node

var program = require('commander');
var exec = require('child_process').exec;
var moment = require('moment');
var async = require('async');

program
    .version('0.0.3')
    .usage('[options]')
    .option('-p, --path [path]','path to where to execute git (default: __dirname)')
    .option('-r, --remote [name]','use remote named (default: use local branches)')
    .option('-o, --origin','use origin (same as --remote="origin")')
    .option('-b, --both','use both origin and local at the same time (default: use local branches)')
    .option('-t, --target [name]','the name of the target branch that is checked (default: master)')
    .option('-e, --emulate','do all checks but don\'t really delete the branches (will only output messages)')
    .option('-b, --prefix [regex]','only delete branches matching this regex')
    .parse(process.argv);
program.path = program.path || process.cwd();
program.remote = program.remote || 'origin';
program.target = program.target || 'master';
var useLocal = true;
var useOrigin = false;
if (program.origin) {
  useOrigin = true;
  useLocal = false;
}
if (program.both) {
  useOrigin = true;
  useLocal = true;
}
if (program.emulate) {
  console.log("emulation mode");
}
process.chdir(program.path);
if (useLocal) {
  doJob('refs/heads/');
}
if (useOrigin) {
  doJob('refs/remotes/', program.remote);
}

function doJob(prefix, remote) {
  var fullPath = prefix;
  if (remote) {
    if (remote.substr(remote.length-1,1)!=="/") {
      remote += "/";
    }
    fullPath = prefix+remote;
  }
  var cmdRevision = 'git rev-parse --verify '+fullPath+program.target;

  exec(cmdRevision, function (error, stdout, stderr) {
    if (error || stdout.length<=0) {
      throw new Error("failed to acquire current head commit");
    }
    var currentHead = stdout;
    async.parallel([
      function(cb) {
        function parseRefs(inString, fullPath) {
          var branches = {};
          var lines = inString.split("\n");
          for (var i=0;i<lines.length;i++) {
            var line = lines[i];
            var vals = line.split("\t");
            if (vals.length<2) continue;
            var name = vals[0].substr(fullPath.length);
            var obj = {prefix: prefix, remote: remote, name: name, lastModified: moment(new Date(vals[1])), author: vals[2]};
            if (name===program.target) continue;
            if (program.prefix && !((new RegExp(program.prefix)).test(name))) continue;
            branches[name] = obj;
          }
          return branches;
        }

        var cmdHeads = 'git for-each-ref --sort=-committerdate '+fullPath+' --format="%(refname)%09%(committerdate:rfc2822)%09%(authorname)"';
        exec(cmdHeads, function (error, stdout, stderr) {
          if (error) {
            return cb(error);
          }
          var branches = parseRefs(stdout, fullPath);
          return cb(null, branches);
        });
      },
      function(cb) {
        function parseBranches(inString) {
          var branches = {};
          var lines = inString.split("\n");
          for (var i=0;i<lines.length;i++) {
            var line = lines[i];
            if (line.length<=0) continue;
            var myRegexp = /[\s*]+([^\s]+)/g;
            var matches = myRegexp.exec(line);
            if (matches.length<=1) continue;
            var name = matches[1];
            if (remote) {
              name = name.substr(remote.length);
            }
            if (name===program.target) continue;
            if (program.prefix && !((new RegExp(program.prefix)).test(name))) continue;
            branches[name] = 1;
          }
          return branches;
        }

        var cmdMerged = 'git branch '+(remote?'-r ':'')+'--merged '+currentHead;
        exec(cmdMerged, function (error, stdout, stderr) {
          if (error) {
            return cb(error);
          }
          return cb(null, parseBranches(stdout));
        });
      },
    ], function (err, results) {
      var branches = results[0];
      var merged = results[1];
      var max = moment().subtract(14, 'day');
      var keys = Object.keys(branches);
      for (var i=0;i<keys.length;i++) {
        var branch = branches[keys[i]];
        if (branch.lastModified.isBefore(max)) {
          if (merged[branch.name]) {
            deleteBranch(branch.name, remote);
          } else {
            //console.log("branch "+branch.name+" is older than two weeks but not merged");
          }
        } else {
            //console.log("branch "+branch.name+" is younger than two weeks");
        }
      }
    });
  });

  function deleteBranch(name, remote) {
    var cmdDelete = 'git branch -d '+(remote?'-r ':'')+name;
    if (program.emulate) {
      console.log('would delete branch "'+name+'"'+(remote?' in remote '+remote:''));
    } else {
      console.log('going to delete branch "'+name+'"'+(remote?' in remote '+remote:''));
      exec(cmdDelete, function (error, stdout, stderr) {
        if (error) {
          console.log('failed to delete '+name);
        }
      });
    }
  }
}


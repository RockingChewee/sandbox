"use strict";

var commandLineArgs = require('command-line-args');
var fs = require('fs');
var JSFtp = require("jsftp");
JSFtp = require('jsftp-rmr')(JSFtp); // decorate 'jsFtp' with a new method 'rmr'
var FtpDeploy = require('ftp-deploy');

const optionDefinitions = [
  { name: 'local-root', alias: 'l', type: String, multiple: false },
  { name: 'remote-root', alias: 'r', type: String, multiple: false }
];

var options = commandLineArgs(optionDefinitions);

if (!options['local-root'] || !options['remote-root']) {
  return console.log('Please provide the --local-root and --remote-root command line arguments.');
}

var config = {
  username: 'neringaf',
  password: null,
  passwordFilePath: '.ftp.password.pid',
  host: 'ftp.neringafo.com',
  port: 21,
  localRoot: options['local-root'],
  remoteRoot: options["remote-root"],
  //include: ['buildScripts/version.txt'],
  exclude: ['.git', '.gitignore', 'LICENSE', 'README.md', '.editorconfig', '.eslintrc.json', '.ftp.password.pid', 'package.json', 'node_modules', 'buildScripts']
}

fs.access(config.passwordFilePath, fs.constants.F_OK | fs.constants.R_OK, function(err) {

  if (err) {
    return console.log('Please create a text file containing the ftp deployment password under \'' + config.passwordFilePath +'\' and make sure it is readable.\n' + err);
  }

  fs.readFile(config.passwordFilePath, 'utf8', function(err, result) {
    if (err) {
      return console.log('Some other error happened while trying to read the password file under \'' + config.passwordFilePath + '\'.\n' + err);
    }
    console.log('The password was retrieved successfully from \'' + config.passwordFilePath + '\'.');

    config.password = result.trim();

    var jsFtp = new JSFtp({
      host: config.host,
      port: config.port,
      user: config.username,
      pass: config.password
    });

    jsFtp.rmr(config.remoteRoot, function (err) {

      jsFtp.raw("quit", function(err, data) {
        if (err) {
          return console.error('Error occurred while trying to close the ftp connection.\n' + err);
        }
      });

      if (err) {
        return console.log('Error occurred while removing the existing files from the target deployment directory \'' + config.remoteRoot + '\'.\n' + err);
      }
      console.log('Successfully removed the existing files from the target deployment directory \'' + config.remoteRoot + '\'.');

      var ftpDeploy = new FtpDeploy();

      ftpDeploy.deploy(config, function (err) {
        if (err) {
          return console.log('Deployment has failed: ' + err);
        }
        console.log('100%\tDeployment completed successfully.');
      });

      ftpDeploy.on('upload-error', function (data) {
        console.log('An error happened during transfer of file \'' + data.relativePath + '\'.\n' + data.err);
      });

      ftpDeploy.on('uploaded', function(data) {
        console.log(data.percentComplete + '%\tUploaded file \'' +  data.filename + '\'. Remaining to upload: ' + (data.totalFileCount - data.transferredFileCount) + '.');
      });
    });
  });
});

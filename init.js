var Git = require('simple-git')();
var glob = require("glob");
var replace = require("replace");
var sprintf = require("sprintf");

if (!process.env.SLACK_TOKEN) {
    console.log('SLACK_TOKEN is undefined');
    process.exit(1);
}

if (!process.env.GITHUB_ACCESS_TOKEN) {
    console.log('GITHUB_ACCESS_TOKEN is undefined');
    process.exit(1);
}

if (!process.env.TRAVIS_CI_TOKEN) {
    console.log('TRAVIS_CI_TOKEN is undefined');
    process.exit(1);
}

Git.checkout('.');

var jsFiles = glob.sync("*-bot/**/*.js", {
    cwd: __dirname,
    absolute: true,
    ignore: '*-bot/node_modules/**',
});

var jsonFiles = glob.sync("*-bot/config/*.json", {
    cwd: __dirname,
    absolute: true,
});

var botFiles = glob.sync("*-bot/index.js", {
    cwd: __dirname,
    absolute: true,
});

replace({
    regex: 'process\.env\.SLACK_TOKEN',
    replacement: sprintf('"%s"', process.env.SLACK_TOKEN),
    paths: jsFiles,
    recursive: true,
    silent: true,
});
replace({
    regex: 'process\.env\.GITHUB_ACCESS_TOKEN',
    replacement: sprintf('"%s"', process.env.GITHUB_ACCESS_TOKEN),
    paths: jsFiles,
    recursive: true,
    silent: true,
});
replace({
    regex: 'process\.env\.TRAVIS_CI_TOKEN',
    replacement: sprintf('"%s"', process.env.TRAVIS_CI_TOKEN),
    paths: jsFiles,
    recursive: true,
    silent: true,
});
replace({
    regex: '"SLACK_TOKEN"',
    replacement: sprintf('"%s"', process.env.SLACK_TOKEN),
    paths: jsonFiles,
    recursive: true,
    silent: true,
});
replace({
    regex: '"GITHUB_ACCESS_TOKEN"',
    replacement: sprintf('"%s"', process.env.GITHUB_ACCESS_TOKEN),
    paths: jsonFiles,
    recursive: true,
    silent: true,
});
replace({
    regex: '"TRAVIS_CI_TOKEN"',
    replacement: sprintf('"%s"', process.env.TRAVIS_CI_TOKEN),
    paths: jsonFiles,
    recursive: true,
    silent: true,
});

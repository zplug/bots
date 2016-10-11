var Promise = require('bluebird');
var sprintf = require('sprintf');
var fs = require('fs');
var config = require('../config/default.json');
var git = require('simple-git')(config.path.local);
var exec = require('child_process').exec;
var replace = require('replace');

function exists(filePath) {
    try {
        return fs.statSync(filePath).isDirectory();
    } catch (err) {
        return false;
    }
}

module.exports = {
    format: function(args) {
        return {
            attachments: [{
                text: args.text,
                color: args.color,
            }],
            icon_emoji: config.slack.icon_emoji,
            username: config.slack.username,
        };
    },
    gitClone: function(args) {
        if (exists(config.path.local)) {
            return new Promise(function(resolve, reject) {
                resolve();
            });
        }
        return new Promise(function(resolve, reject) {
            require('simple-git')()
                .clone(
                    config.github.url,
                    config.path.local,
                    function(err, res) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                        return args.bot.reply(args.message, {
                            text: sprintf('Cloning %s...', config.path.remote),
                            icon_emoji: config.slack.icon_emoji,
                            username: config.slack.username,
                        });
                    })
                .then(function() {
                    git
                        .addConfig('user.name', config.github.username)
                        .addConfig('user.email', config.github.email)
                        .removeRemote('origin')
                        .addRemote('origin', config.github.remote)
                });
        });
    },
    getVersionStable: function() {
        var ver = [];
        fs.readFileSync(config.path.local + "/README.md")
            .toString()
            .split('\n')
            .forEach(function(element, index, array) {
                if (/^.*stable-v\d+\.\d+\.\d+-e9a326.*$/.test(element)) {
                    ver = element.match(/\d+\.\d+\.\d+/);
                }
            });
        return ver[0] || '0.0.0';
    },
    getVersionLatest: function() {
        return fs.readFileSync(config.path.local + "/doc/VERSION")
            .toString()
            .trim('\n');
    },
    replace: function(current, next, branch) {
        var candidateFiles = {
            latest: [
                config.path.local + '/doc/VERSION',
                config.path.local + '/README.md',
                config.path.local + '/doc/guide/ja/README.md',
                config.path.local + '/base/core/core.zsh',
            ],
            stable: [
                config.path.local + '/README.md',
                config.path.local + '/doc/guide/ja/README.md',
            ]
        };

        switch (branch) {
            case 'latest':
                var files = candidateFiles.latest;
                break;
            case 'stable':
                var files = candidateFiles.stable;
                break;
            default:
                var files = [];
                break;
        }

        replace({
            regex: current,
            replacement: next,
            paths: files,
            recursive: false,
            silent: true,
        });
    }
};

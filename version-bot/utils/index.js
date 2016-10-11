var Promise = require('bluebird');
var sprintf = require('sprintf');
var fs = require('fs');
var config = require('../config/default.json');
var git = require('simple-git')(config.path.local);

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
    }
};

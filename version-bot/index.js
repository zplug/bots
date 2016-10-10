var botkit = require('botkit');
var sprintf = require('sprintf');
var exec = require('child_process').exec;
var request = require('request');
var escapeJSON = require('escape-json-node');
var Promise = require('bluebird');
var githubAPI = require('github');
var shell = require('./helpers/shell.js');
var fs = require('fs');
var semver = require('semver');
var replace = require('replace');
var repo = '/tmp/test';
var git = require('simple-git')(repo);

var config = {
    slack: {
        icon_emoji: ':rocket:',
        username: 'version bot'
    },
}

var SLACK_TOKEN = process.env.SLACK_TOKEN;
var GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;

var controller = botkit.slackbot({
    debug: false
});

controller.spawn({
    token: SLACK_TOKEN
}).startRTM();

github = new githubAPI({
    version: '3.0.0',
    debug: false,
    Promise: Promise,
});

github.authenticate({
    type: 'oauth',
    token: GITHUB_ACCESS_TOKEN
});

var format = function(args) {
    return {
        'username': config.slack.username,
        'attachments': [{
            'text': args.text,
            'color': args.color,
        }],
        'icon_emoji': config.slack.icon_emoji,
    };
};

var commandProcMap = {
    '': function(bot, message) {
        return bot.reply(message, format({
            text: 'too few arguments',
            color: '#ff0000',
        }));
    },
    help: function(bot, message) {
        var attachments = require(__dirname + "/usage.json");
        return bot.reply(message, {
            attachments: attachments,
            icon_emoji: config.slack.icon_emoji,
            username: config.slack.username,
        });
    },
    now: function(bot, message) {
        exec(__dirname + '/helpers/now.sh', function(err, stdout, stderr) {
            var reply_with_attachments = {
                'icon_emoji': config.slack.icon_emoji,
                'username': config.slack.username,
                'attachments': [{
                    'fields': [{
                        'title': 'Current ver.',
                        'value': stdout,
                        'short': true,
                    }, {
                        'title': 'Next patch ver.',
                        'value': semver.inc(stdout, 'patch'),
                        'short': true,
                    }, {
                        'title': 'Next minor ver.',
                        'value': semver.inc(stdout, 'minor'),
                        'short': true,
                    }, {
                        'title': 'Next major ver.',
                        'value': semver.inc(stdout, 'major'),
                        'short': true,
                    }],
                }]
            }
            return bot.reply(message, reply_with_attachments);
        });
    },
    bump: function(bot, message) {
        var version = message.match[2] || '';
        if (!semver.valid(version)) {
            return bot.reply(message, {
                text: 'ERROR: version (n.n.n) is acceptable.',
                icon_emoji: config.slack.icon_emoji,
                username: config.slack.username,
            });
        }

        var currentVersion = fs.readFileSync(repo + "/doc/VERSION").toString().trim('\n');
        var nextVersion = version;
        if (!semver.cmp(currentVersion, '<', nextVersion)) {
            return bot.reply(message, {
                text: 'ERROR: ' + nextVersion + ' is less than current version ' + currentVersion,
                icon_emoji: config.slack.icon_emoji,
                username: config.slack.username,
            });
        }
        switch (nextVersion) {
            case semver.inc(currentVersion, 'patch'):
            case semver.inc(currentVersion, 'minor'):
            case semver.inc(currentVersion, 'major'):
                break;
            default:
                return bot.reply(message, {
                    text: 'ERROR: ' + nextVersion + ' is too large compared with current version' + currentVersion,
                    icon_emoji: config.slack.icon_emoji,
                    username: config.slack.username,
                });
        }

        var convoCtx = {
            bot: bot,
            message: message
        };

        convoCtx.bot.startConversation(convoCtx.message, function(err, convo) {
            convo.ask({
                text: sprintf('Upgrade %s version\nWrite release note:\n(type `skip` to pass this)',
                    semver.diff(currentVersion, nextVersion)
                ),
                icon_emoji: config.slack.icon_emoji,
                username: config.slack.username,
            }, function(response, convo) {
                var note = response.text;
                git
                    .checkout('.')
                    .pull('origin', 'master')
                    .then(function() {
                        replace({
                            regex: currentVersion,
                            replacement: nextVersion,
                            paths: [
                                repo + '/doc/VERSION',
                                repo + '/README.md',
                                repo + '/doc/guide/ja/README.md',
                                repo + '/base/core/core.zsh',
                            ],
                            recursive: false,
                            silent: true,
                        });
                    })
                    .add('./*')
                    .commit('Bump ' + nextVersion)
                    .push('origin', 'master')
                    .then(function() {
                        bot.reply(message, {
                            text: 'Creating releases...',
                            icon_emoji: config.slack.icon_emoji,
                            username: config.slack.username,
                        });
                        github.repos.createRelease({
                                user: "zplug",
                                repo: "test",
                                tag_name: nextVersion,
                                name: nextVersion,
                                body: note == 'skip' ? '' : note,
                            })
                            .then(function(res, err) {
                                var reply_with_attachments = {
                                    'text': 'zplug ' + res.tag_name + ' has been released!',
                                    'icon_emoji': config.slack.icon_emoji,
                                    'username': config.slack.username,
                                    'attachments': [{
                                        'fields': [{
                                            'title': 'Link',
                                            'value': res.html_url,
                                            'short': true,
                                        }, {
                                            'title': 'Note',
                                            'value': res.body,
                                            'short': true,
                                        }],
                                    }]
                                };
                                return bot.reply(message, reply_with_attachments);
                            });
                    });
            });
        });
    }
};

function exists(filePath) {
    try {
        return fs.statSync(filePath).isDirectory();
    } catch (err) {
        return false;
    }
}

var gitClone = function(bot, message) {
    if (exists(repo)) {
        return new Promise(function(resolve, reject) {
            resolve();
        });
    } else {
        return new Promise(function(resolve, reject) {
            require('simple-git')()
                .clone(
                    'git@github.com:zplug/test',
                    repo,
                    function(err, res) {
                        if (err) {
                            console.log('error');
                            reject(err);
                        } else {
                            console.log('ok');
                            resolve();
                        }
                        return bot.reply(message, {
                            text: 'Cloning zplug/test...',
                            icon_emoji: config.slack.icon_emoji,
                            username: config.slack.username,
                        });
                    })
                .then(function() {
                    git
                        .addConfig('user.name', 'zplug-man')
                        .addConfig('user.email', 'b4b4r07+zplug@gmail.com')
                        .removeRemote('origin')
                        .addRemote('origin', 'git@github.com.zplug:zplug/test.git')
                });
        });
    }
};

controller.hears(
    [/^bot\s+(?:ver|version)(?:\s+(\w+)(?:\s+(.+))?)?\s*$/], ['message_received', 'ambient'],
    function(bot, message) {
        gitClone(bot, message).then(function() {
            var command = message.match[1] || '';
            var commandProc = commandProcMap[command];
            if (!commandProc) {
                return bot.reply(message, format({
                    text: sprintf('Unknown command [%s]', command),
                    color: '#ff0000',
                }));
            }
            commandProc(bot, message);
        });
    });

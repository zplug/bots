var botkit = require('botkit');
var sprintf = require('sprintf');
var exec = require('child_process').exec;
var request = require('request');
var escapeJSON = require('escape-json-node');
var Promise = require("bluebird");
var githubAPI = require('github');
var shell = require('./helpers/shell.js');
var fs = require('fs');
var semver = require('semver');

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
    Promise: Promise
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
            if (! semver.valid(version)) {
                return bot.reply(message, {
                    text: 'ERROR: version (n.n.n) is acceptable.',
                    icon_emoji: config.slack.icon_emoji,
                    username: config.slack.username,
                });
            }

            var currentVersion = fs.readFileSync("/tmp/zplug/doc/VERSION").toString().trim('\n');
            var nextVersion = version;

            if (! semver.cmp(currentVersion, '<', nextVersion)) {
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
                    text: 'Upgrade ' + semver.diff(currentVersion, nextVersion) + ' version\n' + 'Write release note:\n(type `skip` if you want to skip this)',
                    icon_emoji: config.slack.icon_emoji,
                    username: config.slack.username,
                }, function(response, convo) {
                    var note = response.text;
                    if (note == 'skip') {
                        note = '';
                    }
                    bot.reply(message, {
                        text: 'Processing...',
                        icon_emoji: config.slack.icon_emoji,
                        username: config.slack.username,
                    });
                    exec(__dirname + '/helpers/bump.sh ' + version, function(err, stdout, stderr){
                        if (err) {
                            convo.say({
                                text: 'ERROR:\n```' + stderr + '```',
                                icon_emoji: config.slack.icon_emoji,
                                username: config.slack.username,
                            });
                            convo.next();
                            return;
                        }
                        var params = {
                            token: SLACK_TOKEN,
                            content: stdout,
                            filetype: 'diff',
                            filename: '',
                            title: sprintf('zplug%s-1.patch', version.replace(/\./g, '')),
                            channels: message.channel
                        };
                        bot.api.files.upload(params, function(err, res) {
                            if (err) {
                                bot.botkit.log('Failed to request of GitHub API:', err);
                            }
                        });
                        convo.ask({
                            text: 'ok? (yes/no):',
                            icon_emoji: config.slack.icon_emoji,
                            username: config.slack.username,
                        });
                        convo.next();
                        convo.ask('',
                                [{
                                    pattern: convoCtx.bot.utterances.yes,
                                    callback: function(response, convo) {
                                        shell.series([
                                                'git -C /tmp/zplug remote set-url origin git@github.com.zplug:zplug/zplug.git',
                                                'git -C /tmp/zplug config user.email "b4b4r07+zplug@gmail.com"',
                                                'git -C /tmp/zplug config user.name "zplug-man"',
                                                'git -C /tmp/zplug add -A',
                                                'git -C /tmp/zplug commit -m "Bump ' + version + '"',
                                                'git -C /tmp/zplug push origin master'
                                        ], function(err) {
                                            github.repos.createRelease({
                                                user: "zplug",
                                                repo: "zplug",
                                                tag_name: version,
                                                name: version,
                                                body: note,
                                            }).then(function(res, err) {
                                                var reply_with_attachments = {
                                                    'text': 'zplug '+res.tag_name+' has been released!',
                                                    'icon_emoji': config.slack.icon_emoji,
                                                    'username': config.slack.username,
                                                    'attachments': [{
                                                        'fields': [{
                                                            'title': 'Releases',
                                                            'value': res.html_url,
                                                            'short': true,
                                                        }, {
                                                            'title': 'Release note',
                                                            'value': res.body,
                                                            'short': true,
                                                        }],
                                                    }]
                                                }
                                                bot.reply(message, reply_with_attachments);
                                            });
                                            convo.next();
                                        });
                                    }
                                    }, {
                                        pattern: convoCtx.bot.utterances.no,
                                        callback: function(response, convo) {
                                            exec('git -C /tmp/zplug checkout .', function(err, stdout, stderr) {
                                            });
                                            convoCtx.bot.api.reactions.add({
                                                timestamp: response.ts,
                                                channel: response.channel,
                                                name: 'ok_woman',
                                            }, function(err, _) {
                                                if (err) {
                                                    convoCtx.bot.botkit.log('Failed to add emoji reaction:', err);
                                                }
                                            });
                                            convo.next();
                                        }
                                    }, {
                                        default: true,
                                        callback: function(response, convo) {
                                            convo.repeat();
                                            convo.next();
                                        }
                                    }]);
                                });
                    });
                });
            }
};

controller.hears([/^bot\s+(?:ver|version)(?:\s+(\w+)(?:\s+(.+))?)?\s*$/],
        ['message_received', 'ambient'],
        function(bot, message) {
            var command = message.match[1] || '';
            var commandProc = commandProcMap[command];
            if(! commandProc) {
                return bot.reply(message, format({
                    text: sprintf('Unknown command [%s]', command),
                    color: '#ff0000',
                }));
            }
            commandProc(bot, message);
        });

/*
 * Help:
 * :dolphin: bot bump {n.n.n}
 */

var botkit = require('botkit');
var sprintf = require('sprintf');
var exec = require('child_process').exec;
var request = require('request');
var escapeJSON = require('escape-json-node');
var Promise = require("bluebird");
var githubAPI = require('github');
var shell = require('./shellHelper');

var config = {
    slack: {
        icon_emoji: ':dolphin:',
        username: 'bump bot'
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

controller.hears(['^bot\\s+bump\\s+(\\S+)'],
        ['message_received', 'ambient'],
        function(bot, message) {
            var version = message.match[1];
            if (! version.match(/^\d+\.\d+\.\d+/)) {
                return bot.reply(message, {
                    text: 'ERROR: version (x.x.x) is acceptable.',
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
                    text: 'Write release note:\n(type `skip` if you want to skip this)',
                    icon_emoji: config.slack.icon_emoji,
                    username: config.slack.username,
                }, function(response, convo) {
                    var note = response.text;
                    if (note == 'skip') {
                        note = '';
                    }
                    exec(__dirname + '/replace_version.zsh ' + version, function(err, stdout, stderr){
                        if (err) {
                            convo.say({
                                text: 'ERROR:\n```' + stderr + '```',
                                icon_emoji: config.slack.icon_emoji,
                                username: config.slack.username,
                            });
                            return;
                        }
                        if (!stdout) {
                            convo.say({
                                text: sprintf('ERROR: %s already bumped', version),
                                icon_emoji: config.slack.icon_emoji,
                                username: config.slack.username,
                            });
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
                                                bot.reply(message, {
                                                    text: 'zplug '+res.tag_name+' has been released!',
                                                    icon_emoji: config.slack.icon_emoji,
                                                    username: config.slack.username,
                                                })});
                                            convo.next();
                                        });
                                    }
                                    }, {
                                        pattern: convoCtx.bot.utterances.no,
                                        callback: function(response, convo) {
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
            });

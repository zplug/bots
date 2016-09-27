/*
 * Help:
 * bot bump 1.2.3
 */

var botkit = require('botkit');
var exec = require('child_process').exec;
var config = {
    slack: {
        icon_emoji: ':dolphin:',
        username: 'bump bot'
    },
}

var SLACK_TOKEN = process.env.SLACK_TOKEN;

var controller = botkit.slackbot({
    debug: false
});

controller.spawn({
    token: SLACK_TOKEN
}).startRTM();

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
                    text: 'Write release note:',
                    icon_emoji: config.slack.icon_emoji,
                    username: config.slack.username,
                }, function(response, convo) {
                    var note = response.text;

                    exec(__dirname + '/replace_version.zsh ' + version, function(err, stdout, stderr){
                        if (err) {
                            convo.say({
                                text: 'ERROR:\n```' + stderr + '```',
                                icon_emoji: config.slack.icon_emoji,
                                username: config.slack.username,
                            });
                            return;
                        }
                        convo.ask({
                            text: 'diff is here:\n```' + stdout + '```\nok? (yes/no):',
                            icon_emoji: config.slack.icon_emoji,
                            username: config.slack.username,
                        });
                        convo.next();
                        convo.ask('',
                                [{
                                    pattern: convoCtx.bot.utterances.yes,
                                    callback: function(response, convo) {
                                        exec(__dirname + '/create_releases.zsh ' + version + ' "' + note + '"', function(err, stdout, stderr){
                                            if (err) {
                                                return convo.say({
                                                    text: 'ERROR:\n```' + stderr + '```',
                                                    icon_emoji: config.slack.icon_emoji,
                                                    username: config.slack.username,
                                                });
                                            }
                                            convoCtx.bot.botkit.log(stdout);
                                            convo.say({
                                                text: '```' + stdout + '```',
                                                icon_emoji: config.slack.icon_emoji,
                                                username: config.slack.username,
                                            });
                                        });
                                        // });
                                        convo.next();
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

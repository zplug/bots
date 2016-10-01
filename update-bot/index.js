/*
 * Help:
 * :up: bot update
 */

var botkit = require('botkit');
var exec = require('child_process').exec;

var SLACK_TOKEN = process.env.SLACK_TOKEN;

var controller = botkit.slackbot({
    debug: false
});

controller.spawn({
    token: SLACK_TOKEN
}).startRTM();

function updateSelf(bot, message){
    exec('git reset --hard origin/master', function(err, stdout, stderr){
        bot.reply(message, {
            text: 'Updated successfully!',
            icon_emoji: ':up:',
            username: 'update bot',
        });
        bot.reply(message, {
            text: 'Restarting...',
            icon_emoji: ':up:',
            username: 'update bot',
        });
        setTimeout(function() {
            process.exit();
        }, 2000);
    });
}

controller.hears(['^bot\\s+update'],
        ['message_received', 'ambient'],
        function(bot, message) {
            bot.reply(message, {
                text: 'Start to update...',
                icon_emoji: ':up:',
                username: 'update bot',
            });
            exec('git fetch', function(err, stdout, stderr) {
                exec('git log master..origin/master', function(err, stdout, stderr) {
                    if (stdout == "") {
                        bot.reply(message, {
                            text: 'Up-to-date.',
                            icon_emoji: ':up:',
                            username: 'update bot',
                        });
                    } else {
                        bot.startConversation(message, function(err, convo) {
                            bot.reply(message, {
                                text: 'Updates are as follows:',
                                icon_emoji: ':up:',
                                username: 'update bot',
                            });
                            bot.reply(message, {
                                text: '```\n' + stdout + '\n```',
                                icon_emoji: ':up:',
                                username: 'update bot',
                            });
                            convo.ask({
                                text: 'Are you sure you want to update? (y/n)',
                                icon_emoji: config.slack.icon_emoji,
                                username: config.slack.username,
                            });
                            convo.next();
                            convo.ask('',
                                    [{
                                        pattern: bot.utterances.yes,
                                        callback: function(response, convo) {
                                            updateSelf(bot, message);
                                            convo.next();
                                        }
                                    },
                                    {
                                        pattern: bot.utterances.no,
                                        callback: function(response, convo) {
                                            bot.reply(message, {
                                                text: 'Cancel to update.',
                                                icon_emoji: ':up:',
                                                username: 'update bot',
                                            });
                                            convo.next();
                                        }
                                    },
                                    {
                                        default: true,
                                        callback: function(response, convo) {
                                            convo.repeat();
                                            convo.next();
                                        }
                                    }]);
                        });
                    }
                });
            });
        });

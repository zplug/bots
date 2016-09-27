/*
 * Help:
 * :hash: #123
 */

var sprintf = require('sprintf');
var botkit = require('botkit');

var SLACK_TOKEN = process.env.SLACK_TOKEN;

var controller = botkit.slackbot({
    debug: false
});

controller.spawn({
    token: SLACK_TOKEN
}).startRTM();

controller.hears('',
        ['direct_mention', 'mention', 'ambient'],
        function(bot, message) {
            var matches = message.text.match(/#[0-9]+/g);
            for (m in matches) {
                bot.reply(message, {
                    text: sprintf('https://github.com/zplug/zplug/issues/%s', matches[m].replace('#', '')),
                    icon_emoji: ':hash:',
                    username: 'hashtag bot',
                })
            }
        });

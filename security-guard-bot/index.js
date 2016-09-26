var botkit = require('botkit');

var SLACK_TOKEN = process.env.SLACK_TOKEN;

var controller = botkit.slackbot({
    debug: false
});

controller.spawn({
    token: SLACK_TOKEN
}).startRTM();

controller.hears(['^bot$'],
        ['message_received', 'ambient'],
        function(bot, message) {
            return bot.reply(message, {
                text: 'hey',
                icon_emoji: ':guardsman:',
                username: 'security guard bot',
            });
        })

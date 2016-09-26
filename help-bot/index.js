var botkit = require('botkit');

var SLACK_TOKEN = process.env.SLACK_TOKEN;

var controller = botkit.slackbot({
    debug: false
});

controller.spawn({
    token: SLACK_TOKEN
}).startRTM();

controller.hears(['^bot\\s+help'],
        ['message_received', 'ambient'],
        function(bot, message) {
            return bot.reply(message, {
                text: 'Help document is here.',
                icon_emoji: ':question:',
                username: 'help bot',
            })
        })

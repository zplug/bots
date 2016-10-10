var botkit = require('botkit');
var sprintf = require('sprintf');
var config = require('./config/default.json');
var utils = require('./utils');
var Version = require('./version');

var controller = botkit.slackbot({
    debug: false
});

controller.spawn({
    token: config.slack.token,
}).startRTM();

var version = new Version();

var commandProcMap = {
    '': function(bot, message) {
        return bot.reply(message, utils.format({
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
        return version.now(bot, message);
    },
    bump: function(bot, message) {
        return version.bump(bot, message);
    },
};

controller.hears(
    [/^bot\s+(?:ver|version)(?:\s+(\w+)(?:\s+(.+))?)?\s*$/], ['message_received', 'ambient'],
    function(bot, message) {
        utils.gitClone({
            bot: bot,
            message: message,
        }).then(function() {
            var command = message.match[1] || '';
            var commandProc = commandProcMap[command];
            if (!commandProc) {
                return bot.reply(message, utils.format({
                    text: sprintf('Unknown command [%s]', command),
                    color: '#ff0000',
                }));
            }
            commandProc(bot, message);
        });
    });

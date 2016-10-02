/*
 * Help:
 * :question: bot help
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

var format = function(args) {
    return {
        'username': 'help bot' ,
        'attachments': [{
            'text': args.text,
            'color': args.color,
        }],
        'icon_emoji': ':question:'
    }
}

controller.hears(['^bot\\s+help(\\s+(\\S+))?'],
        ['message_received', 'ambient'],
        function(bot, message) {
            var name = message.match[1];
            exec(__dirname + '/help.sh ' + name, function(err, stdout, stderr){
                if (err) {
                    return bot.reply(message, format({
                        text: stderr,
                        color: '#ff0000',
                    }));
                }
                //var fields = JSON.parse(stdout);
                //var attachments = [{
                //    fields: fields,
                //}]
                var attachments = JSON.parse(stdout);
                return bot.reply(message, {
                    attachments: attachments,
                    icon_emoji: ':question:',
                    username: 'help bot',
                });
            });
        });

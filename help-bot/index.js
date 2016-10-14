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

controller.hears(['^bot\\s+(help|usage)(\\s+(\\S+))?'],
        ['message_received', 'ambient'],
        function(bot, message) {
            var name = message.match[2];
            if (typeof name != "undefined") {
                var attachments = require(__dirname + '/../' + name.trim() + '/usage.json');
                return bot.reply(message, {
                    attachments: attachments,
                    icon_emoji: ':question:',
                    username: 'help bot',
                });
            }

            var fields = [];
            var Glob = require("glob").Glob;
            var mg = new Glob(__dirname + "/../*-bot/usage.json", {mark: true}, function(err, matches) {
                if (err) {
                    return bot.reply(message, format({
                        text: stderr,
                        color: '#ff0000',
                    }));
                }
                matches.forEach(function(match, i) {
                    var titles = [];
                    var usage = require(match);
                    usage[0].fields.forEach(function(f, _) {
                        titles.push(f.title);
                    });
                    fields[i] = {
                        'title': usage[0].author_name,
                        'value': titles.join('\n'),
                        'short': false,
                    };
                });
                var attachments = [{
                    pretext: 'For more info, type "bot help xxx-bot" to show usage!',
                    fields: fields,
                }];
                return bot.reply(message, {
                    attachments: attachments,
                    icon_emoji: ':question:',
                    username: 'help bot',
                });
            });
        });

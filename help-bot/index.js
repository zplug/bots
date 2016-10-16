var botkit = require('botkit');
var exec = require('child_process').exec;
var path = require('path');
var sprintf = require('sprintf');
var fs = require('fs');
var Glob = require("glob").Glob;

var fields = [],
    titles = [],
    count = 0,
    config = {
        slack: {
            token: process.env.SLACK_TOKEN,
            icon_emoji: ':question:',
            username: 'help bot',
        },
        color: {
            red: '#ff0000',
        }
    }

var controller = botkit.slackbot({
    debug: false
});

controller.spawn({
    token: config.slack.token
}).startRTM();

controller.hears([/^bot\s+(help|usage)(\s+(\S+))?/], ['message_received', 'ambient'],
    function(bot, message) {
        var name = message.match[3];
        if (typeof name !== 'undefined') {
            var json = path.join(__dirname, '..', name, 'usage.json');
            if (!isExists(json)) {
                return bot.reply(message, {
                    attachments: [{
                        text: name + ': no such bot',
                        color: config.color.red,
                    }],
                    icon_emoji: config.slack.icon_emoji,
                    username: config.slack.username,
                });
            }
            var attachments = require(json);
            return bot.reply(message, {
                attachments: attachments,
                icon_emoji: config.slack.icon_emoji,
                username: config.slack.username,
            });
        }

        Glob('../*-bot/usage.json', {
            cwd: __dirname,
            silent: true,
        }, function(err, matches) {
            if (err) {
                return bot.reply(message, {
                    attachments: [{
                        text: err,
                        color: config.color.red
                    }]
                });
            }
            matches.forEach(function(match) {
                json = require(match);
                json.forEach(function(u) {
                    titles = [];
                    u.fields.forEach(function(f) {
                        titles.push(f.title);
                    });
                    fields[count++] = {
                        'title': u.author_name,
                        'value': titles.join('\n'),
                        'short': false,
                    };
                });
            });
            return bot.reply(message, {
                attachments: [{
                    pretext: 'For more info, type "bot help xxx-bot" to show usage!',
                    fields: fields,
                }],
                icon_emoji: config.slack.icon_emoji,
                username: config.slack.username,
            });
        });
    });

function isExists(file) {
    try {
        fs.statSync(file);
        return true;
    } catch (e) {
        return false;
    }
}

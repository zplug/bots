var botkit = require('botkit');
var sprintf = require('sprintf');
var pr = require('./pr');
var issue = require('./issue');

var config = {
    slack: {
        token: process.env.SLACK_TOKEN,
        icon_emoji: ':github:',
        icon_url: 'https://octodex.github.com/images/baracktocat.jpg',
        username: 'github bot',
    },
    color: {
        red: '#ff0000',
        green: '#00ff00',
    }
};

var controller = botkit.slackbot({
    debug: false
});

controller.spawn({
    token: config.slack.token
}).startRTM();

var commandProcMapPR = {
    '': function(bot, message) {
        return bot.reply(message, {
            username: config.slack.username,
            icon_url: config.slack.icon_url,
            attachments: [{
                text: 'too few arguments',
                color: config.color.red,
            }],
        });
    },
    help: function(bot, message) {},
    list: function(bot, message) {
        pr.list('zplug', 'zplug')
            .then(function(pr) {
                if (pr.length > 0) {
                    var fields = [];
                    pr.forEach(function(e, i, a) {
                        fields[i] = {
                            'title': e.title,
                            'value': e.html_url,
                            'short': false
                        };
                    });
                    return bot.reply(message, {
                        username: config.slack.username,
                        icon_url: config.slack.icon_url,
                        attachments: [{
                            fields: fields,
                        }],
                    });
                }
                return bot.reply(message, {
                    username: config.slack.username,
                    icon_url: config.slack.icon_url,
                    attachments: [{
                        text: 'pr is nothing',
                        color: config.color.red,
                    }],
                });
            });
    }
};

var commandProcMapIssue = {
    '': function(bot, message) {
        return bot.reply(message, {
            username: config.slack.username,
            icon_url: config.slack.icon_url,
            attachments: [{
                text: 'too few arguments',
                color: config.color.red,
            }],
        });
    },
    help: function(bot, message) {},
    list: function(bot, message) {
        issue.list('zplug', 'zplug')
            .then(function(pr) {
                if (pr.length > 0) {
                    var fields = [];
                    pr.forEach(function(e, i, a) {
                        fields[i] = {
                            'title': e.title,
                            'value': e.html_url,
                            'short': false
                        };
                    });
                    return bot.reply(message, {
                        username: config.slack.username,
                        icon_url: config.slack.icon_url,
                        attachments: [{
                            fields: fields,
                        }],
                    });
                }
                return bot.reply(message, {
                    username: config.slack.username,
                    icon_url: config.slack.icon_url,
                    attachments: [{
                        text: 'issue is nothing',
                        color: config.color.red,
                    }],
                });
            });
    }
};

controller.hears([/^bot\s+pr(?:\s+(\S+))?\s*$/], ['message_received', 'ambient'],
    function(bot, message) {
        var command = message.match[1] || '';
        var commandProc = commandProcMapPR[command];
        if (!commandProc) {
            return bot.reply(message, {
                username: config.slack.username,
                icon_url: config.slack.icon_url,
                attachments: [{
                    text: sprintf('Unknown command [%s]', command),
                    color: config.color.red,
                }],
            });
        }
        commandProc(bot, message);
    });

controller.hears([/^bot\s+issue(?:\s+(\S+))?\s*$/], ['message_received', 'ambient'],
    function(bot, message) {
        var command = message.match[1] || '';
        var commandProc = commandProcMapIssue[command];
        if (!commandProc) {
            return bot.reply(message, {
                username: config.slack.username,
                icon_url: config.slack.icon_url,
                attachments: [{
                    text: sprintf('Unknown command [%s]', command),
                    color: config.color.red,
                }],
            });
        }
        commandProc(bot, message);
    });

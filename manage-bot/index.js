/*
 * Help:
 * :robot_face: bot list
 * :robot_face: bot start {xxx-bot}
 * :robot_face: bot stop {xxx-bot}
 * :robot_face: bot restart {xxx-bot}
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

controller.hears(['^bot\\s+list'],
        ['message_received', 'ambient'],
        function(bot, message) {
            exec(__dirname + '/list.sh', function(err, stdout, stderr) {
                if (err) { console.log(err); }
                var fields = JSON.parse(stdout);
                var attachments = [{
                    fields: fields,
                }]
                return bot.reply(message, {
                    attachments: attachments,
                    icon_emoji: ':robot_face:',
                    username: 'manage bot',
                });
            });
        });

controller.hears(['^bot\\s+stop(\\s+(\\S+))?'],
        ['message_received', 'ambient'],
        function(bot, message) {
            var name = message.match[1];
            exec(__dirname + '/stop.sh ' + name, function(err, stdout, stderr) {
                if (err) {
                    return bot.reply(message, {
                        text: stderr,
                        icon_emoji: ':robot_face:',
                        username: 'manage bot',
                    });
                }
                return bot.reply(message, {
                    text: stdout,
                    icon_emoji: ':robot_face:',
                    username: 'manage bot',
                });
            });
        });

controller.hears(['^bot\\s+start(\\s+(\\S+))?'],
        ['message_received', 'ambient'],
        function(bot, message) {
            var name = message.match[1];
            exec(__dirname + '/start.sh ' + name, function(err, stdout, stderr) {
                if (err) {
                    return bot.reply(message, {
                        text: stderr,
                        icon_emoji: ':robot_face:',
                        username: 'manage bot',
                    });
                }
                return bot.reply(message, {
                    text: stdout,
                    icon_emoji: ':robot_face:',
                    username: 'manage bot',
                });
            });
        });

controller.hears(['^bot\\s+restart(\\s+(\\S+))?'],
        ['message_received', 'ambient'],
        function(bot, message) {
            var name = message.match[1];
            exec(__dirname + '/stop.sh ' + name, function(err, stdout, stderr) {
                if (err) {
                    return bot.reply(message, {
                        text: stderr,
                        icon_emoji: ':robot_face:',
                        username: 'manage bot',
                    });
                }
                bot.reply(message, {
                    text: stdout,
                    icon_emoji: ':robot_face:',
                    username: 'manage bot',
                });
                exec(__dirname + '/start.sh ' + name, function(err, stdout, stderr) {
                    if (err) {
                        return bot.reply(message, {
                            text: stderr,
                            icon_emoji: ':robot_face:',
                            username: 'manage bot',
                        });
                    }
                    return bot.reply(message, {
                        text: stdout,
                        icon_emoji: ':robot_face:',
                        username: 'manage bot',
                    });
                });
            });
        });

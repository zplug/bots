var botkit = require('botkit');
var exec = require('child_process').exec;

var SLACK_TOKEN = process.env.SLACK_TOKEN;

var controller = botkit.slackbot({
    debug: false
});

controller.spawn({
    token: SLACK_TOKEN
}).startRTM();

var attachments = function(args) {
    return {
        'username': 'manage bot' ,
        'attachments': [{
            'text': args.text,
            'color': args.color,
        }],
        'icon_emoji': ':robot_face:'
    }
}

controller.hears(['^bot\\s+list'],
        ['message_received', 'ambient'],
        function(bot, message) {
            exec(__dirname + '/list.sh', function(err, stdout, stderr) {
                if (err) { console.log(err); }
                var attachments = JSON.parse(stdout);
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
                    return bot.reply(message, attachments({
                        text: stderr,
                        color: '#ff0000',
                    }));
                }
                return bot.reply(message, attachments({
                    text: stdout,
                    color: '#00ff00',
                }));
            });
        });

controller.hears(['^bot\\s+start(\\s+(\\S+))?'],
        ['message_received', 'ambient'],
        function(bot, message) {
            var name = message.match[1];
            exec(__dirname + '/start.sh ' + name, function(err, stdout, stderr) {
                if (err) {
                    return bot.reply(message, attachments({
                        text: stderr,
                        color: '#ff0000',
                    }));
                }
                return bot.reply(message, attachments({
                    text: stdout,
                    color: '#00ff00',
                }));
            });
        });

controller.hears(['^bot\\s+restart(\\s+(\\S+))?'],
        ['message_received', 'ambient'],
        function(bot, message) {
            var name = message.match[1];
            exec(__dirname + '/stop.sh ' + name, function(err, stdout, stderr) {
                if (err) {
                    return bot.reply(message, attachments({
                        text: stderr,
                        color: '#ff0000',
                    }));
                }
                bot.reply(message, attachments({
                    text: stdout,
                    color: '#00ff00',
                }));
                exec(__dirname + '/start.sh ' + name, function(err, stdout, stderr) {
                    if (err) {
                        return bot.reply(message, attachments({
                            text: stderr,
                            color: '#ff0000',
                        }));
                    }
                    return bot.reply(message, attachments({
                        text: stdout,
                        color: '#00ff00',
                    }));
                });
            });
        });

controller.hears(['^bot\\s+status'],
        ['message_received', 'ambient'],
        function(bot, message) {
            exec(__dirname + '/status.sh', function(err, stdout, stderr) {
                if (err) {
                    return bot.reply(message, {
                        text: stderr,
                        icon_emoji: ':robot_face:',
                        username: 'manage bot',
                    });
                }
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

controller.hears(['^bot\\s+log(\\s+(\\S+)(\\s+(\\d+))?)?'],
        ['message_received', 'ambient'],
        function(bot, message) {
            var name = message.match[1];
            var line = message.match[2];
            exec(__dirname + '/log.sh ' + name + ' ' + line, function(err, stdout, stderr) {
                if (err) {
                    return bot.reply(message, attachments({
                        text: stderr,
                        color: '#ff0000',
                    }));
                }
                return bot.reply(message, attachments({
                    text: stdout,
                    color: '#00ff00',
                }));
            });
        });

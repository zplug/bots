var botkit = require('botkit');
var exec = require('child_process').exec;
var stripAnsi = require('strip-ansi');

var SLACK_TOKEN = process.env.SLACK_TOKEN;

var config = {
    slack: {
        'username': 'run-command bot',
        'icon_emoji': ':trollface:',
        'token': SLACK_TOKEN,
    },
    users: {
        'U0WFNAD1N': 'b4b4r07',
        'U0WG3LZKL': 'nigorojr',
        'U0WSAUZEG': 'ress997',
    },
    colors: {
        'pass': '#00ff00',
        'fail': '#ff0000',
    }
}

var controller = botkit.slackbot({
    debug: false
});

controller.spawn({
    token: config.slack.token
}).startRTM();

var attachments = function(args) {
    return {
        'username': config.slack.username,
        'attachments': [{
            'text': args.text,
            'color': args.color,
        }],
        'icon_emoji': config.slack.icon_emoji,
    }
}

controller.hears(['^bot\\s+rc(\\s+(.+))?$'],
        ['message_received', 'ambient'],
        function(bot, message) {
            if (! config.users[message.user]) {
                return bot.reply(message, attachments({
                    text: "Permission denied",
                    color: config.colors.fail,
                }));
            }
            var command = message.match[1];
            if (typeof command == "undefined") {
                return bot.reply(message, attachments({
                    text: "specify shell command at least",
                    color: config.colors.fail,
                }));
            }
            var options = {
                shell: '/bin/zsh',
                cwd: process.env.HOME,
            };
            exec(command, options, function(err, stdout, stderr){
                if (err) {
                    return bot.reply(message, attachments({
                        text: stderr,
                        color: config.colors.fail,
                    }));
                }
                return bot.reply(message, attachments({
                    text: stripAnsi(stdout),
                    color: config.colors.pass,
                }));
            });
        })

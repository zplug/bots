var botkit = require('botkit');
var exec = require('child_process').exec;
var request = require('request');

var SLACK_TOKEN = process.env.SLACK_TOKEN;
var TRAVIS_CI_TOKEN = process.env.TRAVIS_TOKEN;

var controller = botkit.slackbot({
    debug: false
});

controller.spawn({
    token: SLACK_TOKEN
}).startRTM();

var headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Travis-API-Version': '3',
    'Authorization': 'token ' + TRAVIS_CI_TOKEN,
};

var options = {
    url: 'https://api.travis-ci.org/repo/zplug%2Fzplug/requests',
    method: 'POST',
    headers: headers,
    json: true,
    form: {"request": {"branch": "master"}}
};

var format = function(args) {
    return {
        'username': 'travis bot',
        'attachments': [{
            'text': args.text,
            'color': args.color,
        }],
        'icon_emoji': ':construction_worker:',
    };
};

controller.hears(['^bot\\s+travis\\s+build'],
        ['message_received', 'ambient'],
        function(bot, message) {
            bot.reply(message, format({
                text: 'Start to build...',
                color: '#00ff00',
            }));
            request(options, function (error, response, body) {
                if (error) {
                    return bot.reply(message, format({
                        text: 'Failed to build',
                        color: '#ff0000',
                    }));
                }
            });
        });

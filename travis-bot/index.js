var botkit = require('botkit');
var exec = require('child_process').exec;
var request = require('request');
var Promise = require('bluebird')
var sprintf = require('sprintf')

var SLACK_TOKEN = process.env.SLACK_TOKEN;
var TRAVIS_CI_TOKEN = process.env.TRAVIS_CI_TOKEN;

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

request._xxxAsync = function(method, param) {
    return function(param) {
        return new Promise(function(resolve, reject) {
            request[method](param, function(err, response, body) {
                if (err) {
                    return reject(err);
                }
                resolve({
                    response: response,
                    body: body,
                });
            });
        });
    };
};

request.getAsync = request._xxxAsync('get')
request.postAsync = request._xxxAsync('post')

var commandProcMap = {
    '': function(bot, message) {
        return bot.reply(message, format({
            text: 'too few arguments',
            color: '#ff0000',
        }));
    },
    help: function(bot, message) {
        var attachments = require(__dirname + "/usage.json");
        return bot.reply(message, {
            attachments: attachments,
            icon_emoji: ':construction_worker:',
            username: 'travis bot',
        });
    },
    build: function(bot, message) {
        request.getAsync(options)
        .then(function() {
            return bot.reply(message, format({
                text: 'Called Travis API',
                color: '#00ff00',
            }));
        });
    }
};

controller.hears([/^bot\s+travis(?:\s+(\w+)(?:\s+(\S+))?)?\s*$/],
        ['message_received', 'ambient'],
        function(bot, message) {
            var command = message.match[1] || '';
            var commandProc = commandProcMap[command];
            if(! commandProc) {
                return bot.reply(message, format({
                    text: sprintf('Unknown command [%s]', command),
                    color: '#ff0000',
                }));
            }
            commandProc(bot, message);
        });

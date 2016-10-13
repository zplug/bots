var sprintf = require('sprintf');
var botkit = require('botkit');
var cache = require('memory-cache');
var Slack = require('slack-node');

var SLACK_TOKEN = process.env.SLACK_TOKEN;

slack = new Slack(SLACK_TOKEN);

var notified = {};

var controller = botkit.slackbot({
    debug: false
});

controller.spawn({
    token: SLACK_TOKEN
}).startRTM();

controller.hears('', ['direct_mention', 'mention', 'ambient'],
    function(bot, message) {
        var matches = message.text.match(/#[0-9]+/g);
        matches.forEach(function(hash) {
            bot.reply(message, {
                text: getPermalink(hash, message.user),
                icon_emoji: ':hash:',
                username: 'hashtag bot',
            });
        });
    });

var getPermalink = function(hash, user) {
    if (cache.get(hash) === null) {
        notified[hash] = false;
        cache.put(hash, hash, 60 * 1000 * 10); // 10 min
        return sprintf('https://github.com/zplug/zplug/issues/%s', hash.replace('#', ''))
    }

    // Send DM for the first time only if hash is cached
    if (notified[hash] == false) {
        slack.api('chat.postMessage', {
            text: hash + ': Not display permalink to be cached (10 min)',
            username: 'hashtag bot',
            icon_emoji: ':hash:',
            channel: user,
        }, function(err, response) {
            if (err) console.log(err);
        });
        notified[hash] = true;
    }
};

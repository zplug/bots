var sprintf = require('sprintf');
var botkit = require('botkit');
var cache = require('memory-cache');
var Slack = require('slack-node');

var SLACK_TOKEN = process.env.SLACK_TOKEN;
var github = require('./github');

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
            say(bot, message, hash);
        });
    });

var say = function(bot, message, hash) {
    var num = hash.replace('#', '');
    if (cache.get(hash) === null) {
        notified[hash] = false;
        cache.put(hash, hash, 60 * 1000 * 10); // 10 min

        return bot.reply(message, {
            text: sprintf('https://github.com/zplug/zplug/issues/%s', num),
            icon_emoji: ':hash:',
            username: 'hashtag bot',
        });
        // Rich reply
        github.get(num, function(reply_with_attachments) {
            reply_with_attachments.icon_emoji = ':hash:'
            reply_with_attachments.username = 'hashtag bot';
            bot.reply(message, reply_with_attachments);
        });
        return;
    }

    // Send DM for the first time only if hash is cached
    if (notified[hash] == false) {
        slack.api('chat.postMessage', {
            text: sprintf('<https://github.com/zplug/zplug/issues/%s|%s>: Not display permalink to be cached (10 min)', num, hash),
            username: 'hashtag bot',
            icon_emoji: ':hash:',
            channel: message.user,
        }, function(err, response) {
            if (err) console.log(err);
        });
        notified[hash] = true;
    }
};

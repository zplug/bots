var sprintf = require('sprintf');
var botkit = require('botkit');
var cache = require('memory-cache');
var Slack = require('slack-node');
var CronJob = require('cron').CronJob;
var moment = require('moment');
var github = require('./github');

var SLACK_TOKEN = process.env.SLACK_TOKEN;

slack = new Slack(SLACK_TOKEN);

var notified = {};

var controller = botkit.slackbot({
    debug: false
});

controller.spawn({
    token: SLACK_TOKEN
}).startRTM(function(err, bot, payload) {
    if (err) {
        throw new Error('Could not connect to Slack');
    }
    new CronJob({
        cronTime: '0 */1 * * *', // ever hour
        onTick: function() {
            github.get(function(result) {
                var now = moment().format("YYYY-MM-DD HH:mm:ssZ");
                bot.botkit.log(now + ': Fetched ' + result.length + ' items.');
                bot.botkit.log(now + ': Cleared cache.');
                cache.clear();
            });
        },
        start: true,
        timeZone: 'Asia/Tokyo'
    });
});

controller.hears('', ['direct_mention', 'mention', 'ambient'],
    function(bot, message) {
        var matches = message.text.match(/#[0-9]+/g);
        matches.forEach(function(hash) {
            Say(bot, message, hash);
        });
    });

var Say = function(bot, message, hash) {
    var num = hash.replace('#', '');
    var key = hash + message.channel; // for each channel
    if (cache.get(key) === null) {
        notified[key] = false;
        cache.put(key, key, 60 * 1000 * 10); // 10 min

        github.select(num, function(resp) {
            return bot.reply(message, {
                icon_emoji: ':hash:',
                username: 'hashtag bot',
                attachments: resp,
            });
        });
        return;
    }

    // Send DM for the first time only if hash is cached
    if (!notified[key]) {
        slack.api('chat.postMessage', {
            text: sprintf('<https://github.com/zplug/zplug/issues/%s|%s>: Not display permalink to be cached (10 min)', num, hash),
            username: 'hashtag bot',
            icon_emoji: ':hash:',
            channel: message.user,
        }, function(err, resp) {
            if (err) {
                console.log(err);
            }
        });
        notified[key] = true;
    }
};

var Promise = require('bluebird');
var sprintf = require('sprintf');
var githubAPI = require('github');
var fs = require('fs');
var semver = require('semver');
var replace = require('replace');
var config = require('../config/default.json');
var git = require('simple-git')(config.path.local);

github = new githubAPI({
    version: '3.0.0',
    debug: false,
    Promise: Promise,
});

github.authenticate({
    type: 'oauth',
    token: config.github.token,
});

exports.run = function(bot, message) {
    var nextVersion = message.match[2] || '';
    var currentVersion = fs.readFileSync(config.path.local + "/doc/VERSION").toString().trim('\n');

    if (!semver.valid(nextVersion)) {
        return bot.reply(message, {
            text: 'ERROR: version (n.n.n) is acceptable.',
            icon_emoji: config.slack.icon_emoji,
            username: config.slack.username,
        });
    }
    if (!semver.cmp(currentVersion, '<', nextVersion)) {
        return bot.reply(message, {
            text: 'ERROR: ' + nextVersion + ' is less than current version ' + currentVersion,
            icon_emoji: config.slack.icon_emoji,
            username: config.slack.username,
        });
    }
    switch (nextVersion) {
        case semver.inc(currentVersion, 'patch'):
        case semver.inc(currentVersion, 'minor'):
        case semver.inc(currentVersion, 'major'):
            break;
        default:
            return bot.reply(message, {
                text: 'ERROR: ' + nextVersion + ' is too large compared with current version ' + currentVersion,
                icon_emoji: config.slack.icon_emoji,
                username: config.slack.username,
            });
    }

    var convoCtx = {
        bot: bot,
        message: message
    };

    convoCtx.bot.startConversation(convoCtx.message, function(err, convo) {
        convo.ask({
            text: sprintf('Upgrade %s version\nWrite release note:\n(type `skip` to pass this)',
                semver.diff(currentVersion, nextVersion)
            ),
            icon_emoji: config.slack.icon_emoji,
            username: config.slack.username,
        }, function(response, convo) {
            var note = response.text;
            git
                .checkout('.')
                .pull('origin', 'master')
                .then(function() {
                    replace({
                        regex: currentVersion,
                        replacement: nextVersion,
                        paths: [
                            config.path.local + '/doc/VERSION',
                            config.path.local + '/README.md',
                            config.path.local + '/doc/guide/ja/README.md',
                            config.path.local + '/base/core/core.zsh',
                        ],
                        recursive: false,
                        silent: true,
                    });
                })
                .add('./*')
                .commit('Bump ' + nextVersion)
                .push('origin', 'master')
                .then(function() {
                    bot.reply(message, {
                        text: 'Creating releases...',
                        icon_emoji: config.slack.icon_emoji,
                        username: config.slack.username,
                    });
                    github.repos.createRelease({
                            user: config.github.user,
                            repo: config.github.repo,
                            tag_name: nextVersion,
                            name: nextVersion,
                            body: note == 'skip' ? '' : note,
                        })
                        .then(function(res, err) {
                            var reply_with_attachments = {
                                'text': 'zplug ' + res.tag_name + ' has been released!',
                                'icon_emoji': config.slack.icon_emoji,
                                'username': config.slack.username,
                                'attachments': [{
                                    'fields': [{
                                        'title': 'Link',
                                        'value': res.html_url,
                                        'short': true,
                                    }, {
                                        'title': 'Note',
                                        'value': res.body,
                                        'short': true,
                                    }],
                                }]
                            };
                            return bot.reply(message, reply_with_attachments);
                        });
                });
        });
    });
};

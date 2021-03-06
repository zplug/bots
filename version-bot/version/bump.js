var Promise = require('bluebird');
var sprintf = require('sprintf');
var githubAPI = require('github');
var fs = require('fs');
var semver = require('semver');
var replace = require('replace');
var config = require('../config/default.json');
var utils = require('../utils');
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
    var branch = message.match[3] || 'latest';
    switch (branch) {
        case 'latest':
            var currentVersion = utils.getVersionLatest();
            break;
        case 'stable':
            var currentVersion = utils.getVersionStable();
            break;
        default:
            return bot.reply(message, utils.format({
                text: sprintf('%s: no such target', branch),
                color: config.color.red,
            }));
    }

    if (!semver.valid(nextVersion)) {
        return bot.reply(message, utils.format({
            text: sprintf('%s: invalid format (accepts only {n.n.n} style)', nextVersion),
            color: config.color.red,
        }));
    }
    if (!semver.cmp(currentVersion, '<', nextVersion)) {
        return bot.reply(message, utils.format({
            text: sprintf('%s is less than current version %s', nextVersion, currentVersion),
            color: config.color.red,
        }));
    }

    // Endpoint
    if (branch == 'stable') {
        git
            .checkout('.')
            .pull('origin', 'master')
            .then(function() {
                // replace current version with next one in many files
                utils.replace(currentVersion, nextVersion, branch);
            })
            .addConfig('user.name', config.github.username)
            .addConfig('user.email', config.github.email)
            .add('./*')
            .commit(sprintf('Bump %s %s', branch, nextVersion))
            .push('origin', 'master')
            .then(function() {
                bot.reply(message, {
                    text: sprintf('zplug %s %s has been pushed!', branch, nextVersion),
                    icon_emoji: config.slack.icon_emoji,
                    username: config.slack.username,
                });
            });
        return;
    }

    switch (nextVersion) {
        case semver.inc(currentVersion, 'patch'):
        case semver.inc(currentVersion, 'minor'):
        case semver.inc(currentVersion, 'major'):
            break;
        default:
            return bot.reply(message, utils.format({
                text: sprintf('%s is too large compared with current version %s', nextVersion, currentVersion),
                color: config.color.red,
            }));
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
                    // replace current version with next one in many files
                    utils.replace(currentVersion, nextVersion, branch);
                })
                .addConfig('user.name', config.github.username)
                .addConfig('user.email', config.github.email)
                .add('./*')
                .commit(sprintf('Bump %s %s', branch, nextVersion))
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

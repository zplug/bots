var fs = require('fs');
var semver = require('semver');
var sprintf = require('sprintf');
var config = require('../config/default.json');
var utils = require('../utils');

exports.run = function(bot, message) {
    var branch = message.match[2] || 'latest';
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
    var reply_with_attachments = {
        'icon_emoji': ':rocket:',
        'username': 'version bot',
        'attachments': [{
            'fields': [{
                'title': 'Current ver.',
                'value': currentVersion,
                'short': true,
            }, {
                'title': 'Next patch ver.',
                'value': semver.inc(currentVersion, 'patch'),
                'short': true,
            }, {
                'title': 'Next minor ver.',
                'value': semver.inc(currentVersion, 'minor'),
                'short': true,
            }, {
                'title': 'Next major ver.',
                'value': semver.inc(currentVersion, 'major'),
                'short': true,
            }],
        }]
    }
    return bot.reply(message, reply_with_attachments);
}

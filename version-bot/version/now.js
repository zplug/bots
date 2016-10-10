var fs = require('fs');
var semver = require('semver');
var config = require('../config/default.json');

exports.run = function(bot, message) {
    var currentVersion = fs.readFileSync(config.path.local + "/doc/VERSION").toString().trim('\n');
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

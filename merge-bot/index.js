/*
 * Help:
 * bot merge 123
 */

var moment = require('moment');
var sprintf = require('sprintf');
var botkit = require('botkit');
var githubAPI = require('github');

var SLACK_TOKEN = process.env.SLACK_TOKEN;
var GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
var GITHUB_ICON = 'http://www.freeiconspng.com/uploads/github-logo-icon-0.png'

const COLOR_MERGED    = '#65488D';
const COLOR_CLOSED    = '#B52003';
const COLOR_OPEN      = '#67C63D';
const COLOR_NOT_FOUND = '#D3D3D3';

var controller = botkit.slackbot({
    debug: false
});

controller.spawn({
    token: SLACK_TOKEN
}).startRTM();

github = new githubAPI({
    version: '3.0.0'
});

github.authenticate({
    type: 'oauth',
    token: GITHUB_ACCESS_TOKEN
});

var pullRequestsMerge = function(bot, message, args) {
    github.pullRequests.merge({
        user: args.user,
        repo: args.repo,
        number: Number(args.id)
    }, function(err, pr) {
        if (err) {
            bot.botkit.log('Failed to request of GitHub API:', err);
        }
    });
};

var issuesGet = function(bot, message, args) {
    github.issues.get({
        user: args.user,
        repo: args.repo,
        number: Number(args.id)
    }, function(err, issue) {
        if (err) {
            bot.botkit.log('Failed to request of GitHub API:', err);
            var reply_with_attachments = {
                'attachments': [
                {
                    'pretext': sprintf('%d %s', err.code, err.status),
                    'title': sprintf('%s (#%d)', 'No such data', args.id),
                    'title_link': sprintf('https://github.com/%s/%s', args.user, args.repo),
                    'color': COLOR_NOT_FOUND,
                    'footer': 'N/A',
                    'footer_icon': GITHUB_ICON,
                    'ts': moment().format('X')
                }
                ]
            }
            bot.reply(message, reply_with_attachments);
            return;
        }
        var reply_with_attachments = {
            'attachments': [
            {
                'pretext': 'This is not a Pull Request... :sweat_smile:',
                'title': sprintf('%s (#%d)', issue.title, issue.number),
                'title_link': issue.html_url,
                'text': issue.body,
                'color': issue.state === 'open' ? COLOR_OPEN : COLOR_CLOSED,
                'fields': [
                {
                    'title': 'State',
                    'value': issue.state,
                    'short': true,
                },
                {
                    'title': 'Closed At',
                    'value':issue.state === 'open' ? 'N/A' : moment(issue.closed_at).format('YYYY-MM-DD HH:mm:ss Z'),
                    'short': true,
                }
                ],
                'thumb_url': issue.user.avatar_url,
                'footer': sprintf('%s/%s#%d', args.user, args.repo, args.id),
                'footer_icon': GITHUB_ICON,
                'ts': moment(issue.created_at).format('X')
            }
            ]
        }
        bot.reply(message, reply_with_attachments);
    })
};

var diffUpload = function(bot, message, args) {
    var request = require('request');
    var options = {
        url: args.pr.diff_url,
    };
    request.get(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var messageObj = {
                token: SLACK_TOKEN,
                content: body,
                filetype: 'diff',
                filename: sprintf('diff-%d.txt', args.pr.number),
                title: args.pr.title,
                channels: message.channel
            };
            bot.api.files.upload(messageObj, function(err, res){
                if (err) {
                    bot.botkit.log('Failed to request of GitHub API:', err);
                }
            });
        } else {
            bot.botkit.log('error: '+ response.statusCode);
        }
    })
};

var pullRequestsConflicts = function(bot, message, args) {
    var reply_with_attachments = {
        'attachments': [
        {
            'pretext': 'This branch has conflicts that must be resolved',
            'title': sprintf('%s (#%d)', args.pr.title, args.pr.number),
            'title_link': args.pr.html_url,
            'text': args.pr.body,
            'color': COLOR_NOT_FOUND,
            'fields': [
            {
                'title': 'State',
                'value': args.pr.state,
                'short': true,
            }
            ],
            'thumb_url': args.pr.user.avatar_url,
            'footer': sprintf('%s/%s#%d', args.user, args.repo, args.id),
            'footer_icon': GITHUB_ICON,
            'ts': moment(args.pr.created_at).format('X')
        }
        ]
    }
    bot.reply(message, reply_with_attachments);
}

var pullRequestsAlreadyMerged = function(bot, message, args) {
    if (args.pr.merged) {
        var color = COLOR_MERGED;
        var pretext = 'This Pull Request has been already merged';
        var f_title = 'Merged At';
        var f_value = moment(args.pr.merged_at).format('YYYY-MM-DD HH:mm:ss Z')
    } else {
        var color = COLOR_CLOSED;
        var pretext = 'This Pull Request has been already closed';
        var f_title = 'Closed At';
        var f_value = moment(args.pr.closed_at).format('YYYY-MM-DD HH:mm:ss Z')
    }
    var reply_with_attachments = {
        'attachments': [
        {
            'pretext': pretext,
            'title': sprintf('%s (#%d)', args.pr.title, args.pr.number),
            'title_link': args.pr.html_url,
            'text': args.pr.body,
            'color': color,
            'fields': [
            {
                'title': 'State',
                'value': args.pr.state,
                'short': true,
            },
            {
                'title': f_title,
                'value': f_value,
                'short': true,
            }
            ],
            'thumb_url': args.pr.user.avatar_url,
            'footer': sprintf('%s/%s#%d', args.user, args.repo, args.id),
            'footer_icon': GITHUB_ICON,
            'ts': moment(args.pr.created_at).format('X')
        }
        ]
    }
    bot.reply(message, reply_with_attachments);
}

controller.hears(['^bot\\s+merge\\s+([0-9]+)$'], ['message_received', 'ambient'], function(bot, message) {
    var matches = message.text.match(/^bot +merge +([0-9]+)$/i);
    var user = 'zplug';
    var repo = 'zplug';
    var id   = Number(matches[1]);

    github.pullRequests.get({
        user: user,
        repo: repo,
        number: id
    }, function(err, pr) {
        // Issues
        if (err) {
            // 404 Not Found
            issuesGet(bot, message, {
                user: user,
                repo: repo,
                id:   id
            });
            return;
        }

        // Already Closed or Merged
        if (pr.state === 'closed') {
            pullRequestsAlreadyMerged(bot, message, {
                user: user,
                repo: repo,
                id:   id,
                pr:   pr
            });
            return;
        }
        // Conflicts
        if (pr.state === 'open' && !pr.mergeable) {
            pullRequestsConflicts(bot, message, {
                user: user,
                repo: repo,
                id:   id,
                pr:   pr
            });
            return;
        }

        /*
         *
         * Mergeable pattern
         *
         */

        // Upload diff snippet
        diffUpload(bot, message, {
            user: user,
            repo: repo,
            id:   id,
            pr:   pr
        });

        // Merge
        var reply_with_attachments = {
            'text': sprintf('This Pull Request is mergeable! (*<%s/files|Diff>*)', pr.html_url),
            'attachments': [
            {
                'pretext': 'Are you sure you want to merge? [y/N]',
                'title': sprintf('%s (#%d)', pr.title, pr.number),
                'title_link': pr.html_url,
                'text': pr.body,
                'color': COLOR_OPEN,
                'fields': [
                {
                    'title': 'commits',
                    'value': pr.commits,
                    'short': true,
                },
                {
                    'title': 'changed files',
                    'value': pr.changed_files,
                    'short': true,
                }
                ],
                'thumb_url': pr.user.avatar_url,
                'footer': sprintf('%s/%s#%d', user, repo, id),
                'footer_icon': GITHUB_ICON,
                'ts': moment(pr.created_at).format('X')
            }
            ],
            'unfurl_links': false,
            'unfurl_media': false
        }
        bot.startConversation(message, function(err,convo) {
            convo.ask(reply_with_attachments, [{
                pattern: bot.utterances.yes,
                callback: function(response, convo) {
                    pullRequestsMerge(bot, response, {
                        user: user,
                        repo: repo,
                        id:   id
                    });

                    convo.next();
                }
            }, {
                pattern: bot.utterances.no,
                callback: function(response, convo) {
                    bot.api.reactions.add({
                        timestamp: response.ts,
                        channel: response.channel,
                        name: 'ok_woman',
                    }, function(err, _) {
                        if (err) {
                            bot.botkit.log('Failed to add emoji reaction:', err);
                        }
                    });

                    convo.next();
                }
            }, {
                    default: true,
                    callback: function(response, convo) {
                        convo.say('Please say YES or NO');
                        convo.repeat();
                        convo.next();
                    }
                }
            ]);
        });
    });
});

var sprintf = require('sprintf');
var moment = require('moment');

var SLACK_TOKEN = "xoxb-36586406480-Q7DSVihitcZf5erHRGWM5CCX";
var GITHUB_ICON = 'http://www.freeiconspng.com/uploads/github-logo-icon-0.png';

const COLOR_MERGED = '#65488D';
const COLOR_CLOSED = '#B52003';
const COLOR_OPEN = '#67C63D';
const COLOR_NOT_FOUND = '#D3D3D3';

var GitHubApi = require("github");

var github = new GitHubApi({
    debug: true,
    Promise: require('bluebird'),
    followRedirects: false,
    timeout: 5000
});

module.exports = {
    get: function(num, callback) {
        github.pullRequests.get({
            user: 'zplug',
            repo: 'zplug',
            number: Number(num),
        }, function(err, pr) {
            // Issues
            if (err) {
                // 404 Not Found
                github.issues.get({
                    user: 'zplug',
                    repo: 'zplug',
                    number: Number(num)
                }, function(err, is) {
                    if (err) {
                        // not found
                        callback(issue.not_found(err, is));
                        return;
                    }
                    // true
                    callback(issue.closed(is));
                });
                return;
            }

            // Already Closed or Merged
            if (pr.state === 'closed') {
                callback(pullreq.merged(pr));
                return;
            }
            // Conflicts
            if (pr.state === 'open' && !pr.mergeable) {
                callback(pullreq.conflict(pr));
                return;
            }

            // Merge
            callback(pullreq.conflict(mergeable));
        });
    }
};

var pullreq = {
    not_found: function() {},
    conflict: function(res) {
        return {
            'attachments': [{
                'pretext': 'This branch has conflicts that must be resolved',
                'title': sprintf('%s (#%d)', res.title, res.number),
                'title_link': res.html_url,
                'text': res.body,
                'color': COLOR_NOT_FOUND,
                'fields': [{
                    'title': 'State',
                    'value': res.state,
                    'short': true,
                }],
                'thumb_url': res.user.avatar_url,
                'footer': sprintf('%s/%s#%d', 'zplug', 'zplug', res.number),
                'footer_icon': GITHUB_ICON,
                'ts': moment(res.created_at).format('X')
            }]
        }
    },
    merged: function(res) {
        if (res.merged) {
            var color = COLOR_MERGED;
            var pretext = 'This Pull Request has been already merged';
            var f_title = 'Merged At';
            var f_value = moment(res.merged_at).format('YYYY-MM-DD HH:mm:ss Z')
        } else {
            var color = COLOR_CLOSED;
            var pretext = 'This Pull Request has been already closed';
            var f_title = 'Closed At';
            var f_value = moment(res.closed_at).format('YYYY-MM-DD HH:mm:ss Z')
        }
        var reply_with_attachments = {
            'attachments': [{
                'pretext': pretext,
                'title': sprintf('%s (#%d)', res.title, res.number),
                'title_link': res.html_url,
                'text': res.body,
                'color': color,
                'fields': [{
                    'title': 'State',
                    'value': res.state,
                    'short': true,
                }, {
                    'title': f_title,
                    'value': f_value,
                    'short': true,
                }],
                'thumb_url': res.user.avatar_url,
                'footer': sprintf('%s/%s#%d', 'zplug', 'zplug', res.number),
                'footer_icon': GITHUB_ICON,
                'ts': moment(res.created_at).format('X')
            }]
        }
        return reply_with_attachments;
    },
    closed: function(res) {},
    mergable: function(res) {
        return {
            'text': sprintf('This Pull Request is mergeable! (*<%s/files|Diff>*)', res.html_url),
            'attachments': [{
                'pretext': 'Are you sure you want to merge? [y/N]',
                'title': sprintf('%s (#%d)', res.title, res.number),
                'title_link': res.html_url,
                'text': res.body,
                'color': COLOR_OPEN,
                'fields': [{
                    'title': 'commits',
                    'value': res.commits,
                    'short': true,
                }, {
                    'title': 'changed files',
                    'value': res.changed_files,
                    'short': true,
                }],
                'thumb_url': res.user.avatar_url,
                'footer': sprintf('%s/%s#%d', 'zplug', 'zplug', res.number),
                'footer_icon': GITHUB_ICON,
                'ts': moment(res.created_at).format('X')
            }],
            'unfurl_links': false,
            'unfurl_media': false
        }
    }
};

var issue = {
    not_found: function(err, res) {
        return {
            'attachments': [{
                'pretext': sprintf('%d %s', err.code, err.status),
                'title': 'No such data',
                'title_link': sprintf('https://github.com/%s/%s', 'zplug', 'zplug'),
                'color': COLOR_NOT_FOUND,
                'footer': 'N/A',
                'footer_icon': GITHUB_ICON,
                'ts': moment().format('X')
            }]
        }
    },
    open: function(res) {
        return {
            'attachments': [{
                'pretext': 'This is not a Pull Request',
                'title': sprintf('%s (#%d)', res.title, res.number),
                'title_link': res.html_url,
                'text': res.body,
                'color': res.state === 'open' ? COLOR_OPEN : COLOR_CLOSED,
                'fields': [{
                    'title': 'State',
                    'value': res.state,
                    'short': true,
                }, {
                    'title': 'Closed At',
                    'value': res.state === 'open' ? 'N/A' : moment(res.closed_at).format('YYYY-MM-DD HH:mm:ss Z'),
                    'short': true,
                }],
                'thumb_url': res.user.avatar_url,
                'footer': sprintf('%s/%s#%d', 'zplug', 'zplug', res.number),
                'footer_icon': GITHUB_ICON,
                'ts': moment(res.created_at).format('X')
            }]
        }
    },
    closed: function(res) {
        return {
            'attachments': [{
                'pretext': 'This is not a Pull Request... :sweat_smile:',
                'title': sprintf('%s (#%d)', res.title, res.number),
                'title_link': res.html_url,
                'text': res.body,
                'color': res.state === 'open' ? COLOR_OPEN : COLOR_CLOSED,
                'fields': [{
                    'title': 'State',
                    'value': res.state,
                    'short': true,
                }, {
                    'title': 'Closed At',
                    'value': res.state === 'open' ? 'N/A' : moment(res.closed_at).format('YYYY-MM-DD HH:mm:ss Z'),
                    'short': true,
                }],
                'thumb_url': res.user.avatar_url,
                'footer': sprintf('%s/%s#%d', 'zplug', 'zplug', res.number),
                'footer_icon': GITHUB_ICON,
                'ts': moment(res.created_at).format('X')
            }]
        }
    }
};

var GitHubApi = require('github');
var moment = require('moment');
var sprintf = require('sprintf');

const COLOR_MERGED = '#65488D';
const COLOR_CLOSED = '#B52003';
const COLOR_OPEN = '#67C63D';
const COLOR_NOT_FOUND = '#D3D3D3';

github = new GitHubApi({
    version: '3.0.0'
});

var GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;

github.authenticate({
    type: 'oauth',
    token: GITHUB_ACCESS_TOKEN,
});

var result = []; // for process cache
var color = COLOR_NOT_FOUND;

function getForRepo(callback) {
    // use process cache
    if (result.length > 0) {
        callback(result);
        return;
    }

    github.issues.getForRepo({
        user: 'zplug',
        repo: 'zplug',
        state: 'all',
        per_page: 100
    }, function(err, data) {
        checkLimit(data);
        if (err) {
            condole.log(err);
        }
        result = result.concat(data);
        if (data && data.meta && data.meta.link) {
            getMore(data.meta.link);
        }
    });

    function getMore(link) {
        if (github.hasNextPage(link)) {
            github.getNextPage(link, function(err, data) {
                checkLimit(data);
                if (err) {
                    console.log(err);
                }
                if (data && data.meta && data.meta.link) {
                    result = result.concat(data);
                    getMore(data.meta.link);
                } else {
                    return;
                }
            });
        } else {
            callback(result);
            return;
        }
    }
}

function checkLimit(data) {
    if (data && data.meta && data.meta['x-ratelimit-remaining']) {
        if (data.meta['x-ratelimit-remaining'] < 100) {
            console.log('Limit reached. Timing out.');
        }
    }
}

function selectOneFromResponse(num, callback) {
    getForRepo(function(result) {
        var r = result.filter(function(item, index) {
            if (item.number == num) return true;
        });
        var resp = r[0];
        if (!resp) {
            var reply = [{
                'title': '404 Not Found',
                'title_link': 'https://github.com/zplug/zplug',
                'text': sprintf('#%s is not the web page you are looking for.', num),
                'color': COLOR_NOT_FOUND,
                'thumb_url': 'https://octodex.github.com/images/octobiwan.jpg',
                'footer': 'GitHub',
                'ts': moment().format('X')
            }];
            callback(reply);
            return;
        }
        if (resp.pull_request !== undefined) {
            color = resp.state == 'open' ? COLOR_OPEN : COLOR_MERGED
        } else {
            color = resp.state == 'open' ? COLOR_OPEN : COLOR_CLOSED;
        }

        var reply = [{
            'title': sprintf('%s (#%d)', resp.title, resp.number),
            'title_link': resp.html_url,
            'text': resp.body,
            'color': color,
            'thumb_url': resp.user.avatar_url,
            'footer': resp.pull_request === undefined ? 'Issues' : 'Pull Requests',
            'ts': moment(resp.created_at).format('X')
        }];
        callback(reply);
    });
}

exports.get = getForRepo;
exports.select = selectOneFromResponse;

// Get all issues when initial running
getForRepo(function() {
    console.log('Fetched ' + result.length + ' items for the first time.');
});

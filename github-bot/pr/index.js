var Promise = require('bluebird');
var GitHubApi = require('github');

github = new GitHubApi({
    version: '3.0.0'
});

github.authenticate({
    type: 'oauth',
    token: process.env.GITHUB_ACCESS_TOKEN,
});

exports.list = function(user, repo) {
    return new Promise(function(resolve, reject) {
        github.pullRequests.getAll({
            user: user,
            repo: repo,
            state: 'open',
            sort: 'updated',
            direction: 'desc'
        }, function(err, data) {
            if (err) {
                reject(err);
                return;
            }
            resolve(data);
        });
    });
};

"use strict"

var sprintf      = require('sprintf').sprintf;
var Promise      = require('bluebird');
var Config       = require('./config')
var SlackBot     = require('./slack-bot')
var SlackParser  = require('./slack-parser')
var slack_bot    = new SlackBot('bot', Config.slack.token)
var slack_parser = new SlackParser(Config.github.oauth.token, slack_bot.slackApiAsync)

function get_config_repo(repo) {
    var config_repo_list = Config.repos.filter(function(config_repo) {
        return config_repo.repo == repo
    })
    if (config_repo_list.length) {
        return config_repo_list[0]
    }
    return null
}

function run_at_each(repo, callback) {
    var config_repo = get_config_repo(repo)
    if (! config_repo) {
        return
    }

    config_repo.run_at.forEach(function(run_at){ callback(config_repo, run_at) })
}

Config.repos.forEach(function(config_repo){
    slack_bot.watch_channel(config_repo.watch_channel, function(response) {
        slack_parser.parse_message_and_emit_maybe(response)
    })
})

slack_parser.on('pr_commit_add', function(user, repo, number, branch, sha, pr, commit_message) {
    console.log(sprintf('Add commit to PR. user:%s repo:%s number:%s branch:%s sha:%s commit_message:%s', user, repo, number, branch, sha, commit_message))
    if (commit_message.match(/Merge remote-tracking branch 'refs\/remotes\/origin\/master'/) ||
       commit_message.match(/Merge branch 'master' into /)) {
        // Merging to master is valid
    } else {
        remove_LGTM_label_if_need(user, repo, number)
    }

    if (commit_message.match(/\bci\s+skip\b/i)) {
        run_at_each(repo, function(config_repo, run_at) {
            slack_parser.createGitHubStatus(run_at.context(), user, repo, sha, 'failure', 'skip test by commit comment.')
        })
        return
    }
})

function remove_LGTM_label_if_need(user, repo, number) {
    slack_parser.githubIssuesGetIssueLabelsAsync({
        user: user,
        repo: repo,
        number: number,
    }).then(function(response) {
        var label_list = []
        var LGTM_found

        response.forEach(function(label_info) {
            if (label_info.name == 'LGTM') {
                LGTM_found = true
            } else {
                label_list.push(label_info.name)
            }
        })
        if (LGTM_found) {
            slack_parser.githubIssuesEditAsync({
                user: user,
                repo: repo,
                number: number,
                labels: label_list,
            }).then(function(ignore) {
            })
        }
    }).catch()
}

slack_bot.run();

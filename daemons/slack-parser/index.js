"use strict"

var util = require('util')
var EventEmitter = require('events').EventEmitter
var Promise   = require('bluebird');
var GitHubApi = require('github');
var sprintf   = require('sprintf').sprintf;

var SlackParser = (function() {
    function SlackParser(oauth_token, slackApiAsync) {
        this.github = new GitHubApi({
            version: '3.0.0',
            protocol: 'https',
        });

        this.github.authenticate({
            type: 'oauth',
            token: oauth_token,
        })
        this.githubPrGetAsync              = Promise.promisify(this.github.pullRequests.get, GitHubApi);
        this.githubPrGetAllAsync           = Promise.promisify(this.github.pullRequests.getAll, GitHubApi);
        this.githubIssueCreateCommentAsync = Promise.promisify(this.github.issues.createComment, GitHubApi);
        this.githubStatusesCreateAsync     = Promise.promisify(this.github.statuses.create, GitHubApi);
        this.githubStatusesGetAsync        = Promise.promisify(this.github.statuses.get, GitHubApi);
        this.githubReposGetCommitAsync     = Promise.promisify(this.github.repos.getCommit, GitHubApi);
        this.githubReposGetCommitListAsync = Promise.promisify(this.github.repos.getCommits, GitHubApi);
        this.githubReposGetBranchAsync     = Promise.promisify(this.github.repos.getBranch, GitHubApi);
        this.githubIssuesGetIssueLabelsAsync = Promise.promisify(this.github.issues.getIssueLabels, GitHubApi);
        this.githubIssuesEditAsync         = Promise.promisify(this.github.issues.edit, GitHubApi);

        this.slackApiAsync = slackApiAsync
    }
    util.inherits(SlackParser, EventEmitter);

    SlackParser.prototype.parse_message_and_emit_maybe = function(response) {
        if (! response.bot_id || response.subtype != 'bot_message' || ! response.attachments) {
            return
        }
        var self = this
        var attachment = response.attachments[0]

        console.log("\n\n")
        if(! attachment.pretext){
            console.log('no pretext', attachment)
            return
        }
        console.log('pretext: ' + attachment.pretext)
        console.log('fallback: ' + attachment.fallback)

        var matches
        if (attachment.pretext.match(/Pull request submitted/) &&
           (matches = attachment.title_link.match(/https:\/\/github\.com\/(.*?)\/(.*?)\/pull\/(\d+)/))) {
            var user   = matches[1]
            var repo   = matches[2]
            var number = matches[3]

            this.githubPrGetAsync({
                user: user,
                repo: repo,
                number: number,
            }).then(function(pr) {
                var branch = pr.head.ref
                var sha    = pr.head.sha

                self.emit('pr_created', user, repo, number, branch, sha, pr)
            })
            return;
        }
        if (attachment.pretext.match(/New comment by /) &&
           (matches = attachment.fallback.match(/https:\/\/github\.com\/(.*?)\/(.*?)\/pull\/(\d+)/))) {
            var user   = matches[1]
            var repo   = matches[2]
            var number = matches[3]

            this.githubPrGetAsync({
                user: user,
                repo: repo,
                number: number,
            }).then(function(pr) {
                var branch = pr.head.ref
                var sha    = pr.head.sha

                self.emit('pr_comment_add', user, repo, number, branch, sha, pr, attachment.text)
            })
            return;
        }
        if (attachment.pretext.match(/new commits?/) &&
           (matches = attachment.fallback.match(/> <https:\/\/github\.com\/(.*?)\/(.*?)\/(?:commit|compare)\/(?:(?:[0-9a-f]+\.\.\.)?([0-9a-f]+))/i))) {
            var user = matches[1]
            var repo = matches[2]
            var short_sha   = matches[3]

            this.githubReposGetCommitAsync({
                user: user,
                repo: repo,
                sha: short_sha,
            }).then(function(commit_response) {
                var sha = commit_response.sha

                self.githubPrGetAllAsync({
                    user: user,
                    repo: repo,
                    sort: 'updated',
                    direction: 'desc',
                }).then(function(response) {
                    var pr, number, branch
                    response.forEach(function(a_pr) {
                        if(a_pr.head.sha == sha){
                            pr     = a_pr
                            number = a_pr.number
                            branch = a_pr.head.ref
                        }
                    })

                    if (! branch && (matches = attachment.fallback.match(/\[(?:\S+?):(\S+?)\]/))) {
                        branch = matches[1]
                    }
                    if (branch != 'master' && ! pr) return

                    console.log('attachment XXX', attachment)
                    self.emit('pr_commit_add', user, repo, number, branch, sha, pr, commit_response.commit.message)
                })
            })
            return;
        }
        console.log('no match', attachment)

        return;
    }

    SlackParser.prototype.createGitHubStatus = function(context, user, repo, sha, status, description, target_url) {
        console.log('createGitHubStatus', context, status, description)
        this.githubStatusesCreateAsync({
            user: user,
            repo: repo,
            sha:  sha,
            state: status,
            description: description,
            context: context,
            target_url: target_url,
        }).then(function(ignore){}).catch(function(err) {
            console.log(err, err.stack, "githubStatusesCreateAsync()")
        });
    }

    SlackParser.prototype.report_to_slack = function(args) {
        var attachments;

        if (args.pretext || args.fallback || args.fields) {
            attachments = JSON.stringify([{
                pretext:    args.pretext,
                color:      args.color,
                fields:     args.fields,
            }])
        }

        this.slackApiAsync("chat.postMessage", {
            channel:    args.channel,
            username:   args.username,
            icon_emoji: args.icon_emoji,
            text:       args.text,
            link_names: 1,
            attachments: attachments,
        }).then(function(response) {
        }).catch(function(err) {
            console.log(err.stack, "slackApiAsync(chat.postMessage)")
        });
    }

    return SlackParser
})();

module.exports = SlackParser;

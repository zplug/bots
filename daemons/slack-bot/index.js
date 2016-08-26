"use strict"

var SlackBot = (function() {
    var util = require('util')
    var EventEmitter = require('events').EventEmitter
    var Promise   = require('bluebird');
    var WebSocket = require('ws');
    var HashTable = require('hashtable')
    var Slack     = require('slack-node');

    function SlackBot(myname, slack_token) {
        var self = this

        this.myname = myname
        this.slack = new Slack(slack_token)
        this.slackApiAsync = Promise.promisify(function(method, options, callback) {
            if (self.channels) {
                if (options.channel && self.channels.by_name.has(options.channel)) {
                    options.channel = self.channels.by_name.get(options.channel).id
                }
                if (options.channels && self.channels.by_name.has(options.channels)) {
                    options.channels = self.channels.by_name.get(options.channels).id
                }
            }
            return self.slack.api(method, options, callback)
        }, Slack)
    }
    util.inherits(SlackBot, EventEmitter);

    SlackBot.prototype.run = function() {
        var self = this
        this.slackApiAsync('rtm.start', {agent: 'slack-bot'}).then(function(response) {
            self.init_by_rtm_response(response)

            self.ws = new WebSocket(response.url);
            self.ws.on('error', function(error) {
                self.run()
            })
            self.ws.on('close', function(code, message) {
                self.run()
            })
            self.ws.on('message', function(raw_response, flags) {
                var response = JSON.parse(raw_response);

                if (response.type && response.type == 'message') {
                    if ((parseInt(response.ts) + 10) < (new Date().getTime() / 1000)) {
                        // skip old message
                        console.log('skip old message', response.text)
                        return
                    }

                    response.user    = self.get_user_by_id(response.user)
                    response.channel = self.get_channel_by_id(response.channel)
                    self.emit('message', response)
                    if (response.channel) {
                        self.emit('message_' + response.channel.name, response)
                    }
                }
                if (response.type && response.type == 'channel_joined') {
                    self.channels.by_name.put(response.channel.name, response.channel)
                    self.channels.by_id.put(response.channel.id, response.channel)
                }
                if (response.type && response.type == 'channel_left') {
                    var channel_data = self.get_channel_by_id(response.channel)
                    self.channels.by_name.remove(channel_data.name)
                    self.channels.by_id.remove(channel_data.id)
                }
                if (response.type && response.type ==  'team_join') {
                    self.users.by_id.put(response.user.id, response.user)
                    self.users.by_id.put(response.user.name, response.user)
                }
                if (response.type && response.type == 'user_change') {
                    self.users.by_id.put(response.user.id, response.user)
                    self.users.by_id.put(response.user.name, response.user)
                }
            });
        });
    }

    SlackBot.prototype.init_by_rtm_response = function(response) {
        var self = this

        this.users = {
            by_name: new HashTable(),
            by_id:   new HashTable(),
        }
        this.channels = {
            by_name: new HashTable(),
            by_id:   new HashTable(),
        }

        response.users.forEach(function(user_data) {
            self.users.by_name.put(user_data.name, user_data)
            self.users.by_id  .put(user_data.id  , user_data)
        })
        response.channels.forEach(function(channel_data) {
            self.channels.by_name.put(channel_data.name, channel_data)
            self.channels.by_id  .put(channel_data.id,   channel_data)
        })
    }

    SlackBot.prototype.get_user_by_name = function(name) {
        return name ? this.users.by_name.get(name) : undefined
    }
    SlackBot.prototype.get_user_by_id = function(id) {
        return id ? this.users.by_id.get(id) : undefined
    }
    SlackBot.prototype.get_channel_by_name = function(name) {
        return name ? this.channels.by_name.get(name) : undefined
    }
    SlackBot.prototype.get_channel_by_id = function(id) {
        return id ? this.channels.by_id.get(id) : undefined
    }
    SlackBot.prototype.watch_channel = function(channel, callback) {
        var event = 'message_' + channel
        this.on(event, callback)
    }
    SlackBot.prototype._receive_message_to_me = function(channel, callback, filter) {
        var self = this
        this.watch_channel(channel, function(response) {
            if(response && response.text && response.text ) {
                var command = response.text.split(/ +/)
                filter(command, response)
            }
        })
    }
    SlackBot.prototype.receive_message_to_me = function(channel, callback) {
        var self = this
        this._receive_message_to_me(channel, callback, function(command, response) {
            if (command.length && command[0] == self.myname) {
                callback(command, response);
            }
        });
    }
    SlackBot.prototype.receive_mension_to_me = function(channel, callback) {
        var self = this
        this._receive_message_to_me(channel, callback, function(command, response) {
            if (command.length) {
                var memsioned_user = self.get_user_by_id(command[0].replace(/<@([^>]+)>:?/, '$1'));
                if (memsioned_user && memsioned_user['name'] == self.myname) {
                    callback(command, response)
                }
            }
        });
    }
    SlackBot.prototype._receive_message_from_belongs_to = function(callback, filter) {
        var self = this
        this.on('message', function(response) {
            if (response && response.text && response.channel && response.channel.is_member) {
                var command = response.text.split(/ +/)
                filter(command, response)
            }
        });
    }
    SlackBot.prototype.receive_message_to_me_from_belongs_to = function(callback) {
        var self = this
        this._receive_message_from_belongs_to(callback, function(command, response) {
            if (command.length && command[0] == self.myname) {
                callback(command, response);
            }
        });
    }
    SlackBot.prototype.receive_mension_to_me_from_belongs_to = function(callback) {
        var self = this
        this._receive_message_from_belongs_to(callback, function(command, response) {
            if(command.length) {
                var memsioned_user = self.get_user_by_id(command[0].replace(/<@([^>]+)>:?/, '$1'));
                if (memsioned_user && memsioned_user['name'] == self.myname) {
                    callback(command, response)
                }
            }
        });
    }

    SlackBot.prototype.say = function(args) {
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
            icon_url:   args.icon_url,
            text:       args.text,
            link_names: 1,
            attachments: attachments,
        }).then(function(response) {
        }).catch(function(err) {
            console.log(err.stack, "slackApiAsync(chat.postMessage)")
        });
    }

    return SlackBot
})();

module.exports = SlackBot;

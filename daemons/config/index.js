"use strict";

var fs    = require('fs');
var token = JSON.parse(fs.readFileSync('./token.json', 'utf8'));

var Config = (function() {
    var sprintf = require('sprintf').sprintf;

    return {
        slack: {
            token: token.slack
        },
        github: {
            oauth: {
                token: token.github
            }
        },
        repos: [
            {
                repo: 'zplug',
                user: 'zplug',
                watch_channel: 'dev-log'
            }
        ]
    }
})();

module.exports = Config;

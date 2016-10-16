var Botkit = require('botkit');
var fs = require('fs');
var path = require('path');

controller = Botkit.slackbot({
    debug: false
});

controller.spawn({
    token: process.env.SLACK_TOKEN
}).startRTM();

var load = function(path, file) {
    var ext = path.extname(file);
    var full = path.join(path, path.basename(file, ext));

    try {
        var script = require(full);
        if (typeof script === 'function') {
            script(this);
        }
    } catch(error) {
        process.exit(1);
    }
};

var path = path.resolve('.', 'scripts');

fs.readdirSync(path).sort().forEach(function(file) {
    load(path, file);
});

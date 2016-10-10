var Version = (function() {
    var Now = require('./now');
    var Bump = require('./bump');

    function Version() {
        var self = this;
    }

    Version.prototype.now = function(bot, message) {
        Now.run(bot, message);
    };

    Version.prototype.bump = function(bot, message) {
        Bump.run(bot, message);
    };

    return Version;
})();

module.exports = Version;

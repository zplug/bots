var child_process = require('child_process');

function updateSelf(bot, message){
    child_process.exec('git reset --hard origin/master', function(error, stdout, stderr){
        bot.reply(message, 'Updated successfully!');
        bot.reply(message, 'Restarting...');
        setTimeout(function(){
            process.exit();
        }, 2000);
    });
}

controller.hears(['update'], 'direct_mention', function(bot, message) {
    bot.reply(message, 'Start to update...');

    child_process.exec('git fetch', function(error, stdout, stderr) {
        child_process.exec('git log master..origin/master', function(error, stdout, stderr) {
            if (stdout == "") {
                bot.reply(message, 'Up-to-date.');
            } else {
                bot.startConversation(message, function(error, convo) {
                    bot.reply(message, 'Updates are as follows:');
                    bot.reply(message, '```\n' + stdout + '\n```');
                    convo.ask('Are you sure you want to update? (y/n)', [
                            {
                                pattern: bot.utterances.yes,
                                callback: function(response, convo) {
                                    updateSelf(bot, message);
                                    convo.next();
                                }
                            },
                            {
                                pattern: bot.utterances.no,
                                callback: function(response, convo) {
                                    bot.reply(message, 'Cancel to update.');
                                    convo.next();
                                }
                            },
                            {
                                default: true,
                                callback: function(response, convo) {
                                    convo.repeat();
                                    convo.next();
                                }
                            }
                    ]);
                });
            }
        });
    });
});

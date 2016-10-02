#!/bin/bash

dir="$(cd $(dirname $0)/..; pwd)"
bot_list="$(
$dir/node_modules/.bin/forever list \
    | sed '1,2d' \
    | awk '{print $3, $5, $9}'
)"

printf '['
for bot in $dir/*-bot/index.js
do
    bot_name=$(echo $bot | xargs dirname | xargs basename)
    pid=$(echo "$bot_list" | grep $bot_name | awk '{print $1}')
    uptime=$(echo "$bot_list" | grep $bot_name | awk '{print $3}')
    emoji=$(awk '/Help:$/{getline;print}' $bot | sed 's/^[^:]*://;s/:[^:]*$//')
    uptime="$(echo $uptime | perl -pe 's/(\d+):(\d+):(\d+):(\d+)\.(\d+)/$1 days $2:$3:$4/')"
    printf '{'
    printf '"title":"%s",' ":$emoji: $bot_name"
    printf '"title_link":"%s",' "https://github.com/zplug/bots/tree/master/$bot_name"
    printf '"fields": ['
    printf '{'
    printf '"title":"%s",' "pid"
    printf '"value":"%s",' "$pid"
    printf '"short":true'
    printf '},'
    printf '{'
    printf '"title":"%s",' "uptime"
    printf '"value":"%s",' "${uptime:-KILLED}"
    printf '"short":true'
    printf '}'
    printf ']'
    printf '},'
done | sed 's/,$//'
printf ']\n'

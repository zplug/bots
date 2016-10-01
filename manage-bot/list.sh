#!/bin/bash

IFS=$'\n'

dir="$(cd $(dirname $0)/..; pwd)"
bot_list=( $(
$dir/node_modules/.bin/forever list \
    | sed '1,2d' \
    | awk '{print $3, $5, $9}' \
    | sort -k2
) )

IFS=' '
printf '['
for bot in "${bot_list[@]}"
do
    set -- $bot
    bot_name="$(dirname $2 | xargs basename)"
    emoji=$(awk '/Help:$/{getline;print}' $dir/$bot_name/index.js | sed 's/^[^:]*://;s/:[^:]*$//')
    uptime="$(echo $3 | perl -pe 's/(\d+):(\d+):(\d+):(\d+)\.(\d+)/$1 days $2:$3:$4/')"
    printf '{'
    printf '"title":"%s",' ":$emoji: $bot_name"
    printf '"title_link":"%s",' "https://github.com/zplug/bots/tree/master/$bot_name"
    printf '"fields": ['
    printf '{'
    printf '"title":"%s",' "pid"
    printf '"value":"%s",' "$1"
    printf '"short":true'
    printf '},'
    printf '{'
    printf '"title":"%s",' "uptime"
    printf '"value":"%s",' "$uptime"
    printf '"short":true'
    printf '}'
    printf ']'
    printf '},'
done | sed 's/,$//'
printf ']\n'

#!/bin/bash

dir="$(cd $(dirname $0)/..; pwd)"

bot_list="$(forever list | sed '1,2d' | awk '{print $5, $9}')"

printf '['
for bot in $dir/*-bot
do
    name="${bot##*/}"
    uptime="$(echo "$bot_list" | grep "/$name/" | awk '{print $2}')"

    printf '{'
    printf '"title":"%s",' "$name"
    printf '"value":"%s",' "${uptime:-"KILLED"}"
    printf '"short":false'
    printf '},'
done | sed 's/,$//'
printf ']\n'

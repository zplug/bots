#!/bin/bash

dir="$(cd $(dirname $0)/..; pwd)"

printf '['
for js in "$dir"/*-bot/index.js
do
    file=$(echo $js | sed 's!^.*bots/!!;s!/index.js$!!')
    printf '{'
    printf '"title":"%s",' "$file"
    printf '"value":"%s",' "$(
    cat "$js" \
        | grep -A 1 "Help:$" \
        | tail -1
    )"
    printf '"short":false'
    printf '},'
done | sed 's/,$//'
printf ']\n'

#!/bin/bash

dir="$(cd $(dirname $0)/..; pwd)"

printf '['
for js in "$dir"/*-bot/index.js
do
    file="$(echo "$js" | sed 's!^.*bots/!!;s!/index.js$!!')"
    help="$(
    cat "$js" \
        | grep -A 1 "Help:$" \
        | tail -1
    )"
    if [[ -z $help ]]; then
        continue
    fi

    printf '{'
    printf '"title":"%s",' "$file"
    printf '"value":"%s",' "$help"
    printf '"short":false'
    printf '},'
done | sed 's/,$//'
printf ']\n'

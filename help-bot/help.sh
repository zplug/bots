#!/bin/bash

bot_name=$1
dir="$(cd $(dirname $0)/..; pwd)"

if [[ -n $bot_name ]] && [[ $bot_name != 'undefined' ]]; then
    if [[ ! -d $dir/$bot_name ]]; then
        echo "$bot_name: no such bot" >&2
        exit 1
    fi
    if [[ -f $dir/$bot_name/usage.json ]]; then
        cat $dir/$bot_name/usage.json
        exit 0
    else
        echo "usage.json: no such file" >&2
        exit 1
    fi
fi

printf '['
printf '{'
printf '"fields":['
for js in "$dir"/*-bot/index.js
do
    file="$(echo "$js" | sed 's!^.*bots/!!;s!/index.js$!!')"
    help="$(
    awk '
    {
        if ($0 ~ /^ \* /) {
            print $0;
        } else {
            getline;
        }
    }' $js | perl -pe 's/\n/\\n/g;s/\s+\*\s+//g'
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
printf ']'
printf '}'
printf ']\n'

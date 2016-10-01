#!/bin/bash

dir="$(cd $(dirname $0)/..; pwd)"
bot="$1"

if [[ -z $bot ]] || [[ $bot == undefined ]]; then
    echo "specify bot name" >&2
    exit 1
fi

if [[ ! -f $dir/$bot/index.js ]]; then
    echo "$bot: no such bot" >&2
    exit 1
fi

bot_list="$(
$dir/node_modules/.bin/forever list \
    | sed '1,2d' \
    | awk '{print $5, $8}' \
    | sort -k2
)"

if [[ $2 =~ [0-9]+ ]]; then
    line=$2
fi
log_file=$(echo "$bot_list" | grep "$bot" | awk '{print $2}')
tail -n ${line:-10} "$log_file"

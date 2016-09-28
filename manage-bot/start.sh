#!/bin/bash

dir="$(cd $(dirname $0)/..; pwd)"

bot="$1"
forever=$dir/node_modules/.bin/forever

if [[ -z $bot ]] || [[ $bot == undefined ]]; then
    echo "specify bot name" >&2
    exit 1
fi

if [[ -f $dir/$bot/index.js ]]; then
    $forever start $dir/$bot/index.js &>/dev/null
    if (( $? == 0 )); then
        echo "started $bot!"
    fi
else
    echo "no such bot" >&2
    exit 1
fi

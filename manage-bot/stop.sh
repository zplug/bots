#!/bin/bash

dir="$(cd $(dirname $0)/..; pwd)"

ret=0
bot="$1"
forever=$dir/node_modules/.bin/forever

if [[ -z $bot ]] || [[ $bot == undefined ]]; then
    echo "specify bot name" >&2
    exit 1
fi

if [[ $bot == 'all' ]]; then
    for bot in $dir/*-bot
    do
        name="${bot##*/}"
        if [[ ! -f $bot/index.js ]]; then
            echo "$name: no such bot" >&2
            ret=1
            continue
        fi

        if [[ $name == 'manage-bot' ]]; then
            echo "$name: skipped (need manually)"
            continue
        fi

        $forever stop $bot/index.js &>/dev/null
        if (( $? == 0 )); then
            echo "stopped $name!"
        else
            echo "failed to stop $name ..." >&2
            ret=1
        fi
    done
    exit $ret
fi

if [[ -f $dir/$bot/index.js ]]; then
    $forever stop $dir/$bot/index.js &>/dev/null
    if (( $? == 0 )); then
        echo "stopped $bot!"
    fi
else
    echo "no such bot" >&2
    exit 1
fi

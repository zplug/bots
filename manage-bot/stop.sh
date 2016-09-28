#!/bin/bash

cnt=0
dir="$(cd $(dirname $0)/..; pwd)"

bot="$1"
forever=$dir/node_modules/.bin/forever

if [[ -z $bot ]] || [[ $bot == undefined ]]; then
    echo "specify bot name" >&2
    exit 1
fi

for pid in $($forever list | grep $bot | awk '{print $3}')
do
    let cnt++
    $forever stop $pid &>/dev/null
    if (( $? == 0 )); then
        echo "killed $bot ($pid)"
    fi
done

if (( $cnt == 0 )); then
    echo "no such bot" >&2
    exit 1
fi

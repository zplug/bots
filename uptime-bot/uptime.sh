#!/bin/bash

dir="$(cd $(dirname $0)/..; pwd)"

IFS=$'\n'
printf '['
for bot in $($dir/node_modules/.bin/forever list | sed '1,2d' | awk '{print $5, $9}')
do
    printf '{'
    printf '"title":"%s",' "$(echo "$bot" | awk '{print $1}' | xargs dirname | xargs basename)"
    printf '"value":"%s",' "$(echo "$bot" | awk '{print $2}')"
    printf '"short":false'
    printf '},'
done | sed 's/,$//'
printf ']\n'

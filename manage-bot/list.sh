#!/bin/bash

dir="$(cd $(dirname $0)/..; pwd)"

printf '['
for bot in "$dir"/*-bot
do
    printf '{'
    printf '"title":"%s",' "${bot##*/}"
    printf '"short":false'
    printf '},'
done | sed 's/,$//'
printf ']\n'

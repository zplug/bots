#!/bin/bash

slack_token="$(env | grep '^SLACK_TOKEN' | sed 's/SLACK_TOKEN=//')"
github_token="$(env | grep '^GITHUB_ACCESS_TOKEN' | sed 's/GITHUB_ACCESS_TOKEN=//')"
travis_ci_token="$(env | grep '^TRAVIS_CI_TOKEN' | sed 's/TRAVIS_CI_TOKEN=//')"

if [[ -z $slack_token ]] || [[ -z $github_token ]] || [[ -z $travis_ci_token ]]; then
    printf 'tokens are invalid...\n' >&2
    exit 1
fi

git checkout .
for js in ./*-bot/index.js
do
    perl -pi -e 's/^(var SLACK_TOKEN = )(.+;)$/$1"'$slack_token'";/g' "$js"
    perl -pi -e 's/^(var GITHUB_ACCESS_TOKEN = )(.+;)$/$1"'$github_token'";/g' "$js"
    perl -pi -e 's/^(var TRAVIS_CI_TOKEN = )(.+;)$/$1"'$travis_ci_token'";/g' "$js"
done
for js in ./*-bot/config/*.json
do
    perl -pi -e 's/"SLACK_TOKEN"/"'$slack_token'"/g' "$js"
    perl -pi -e 's/"GITHUB_ACCESS_TOKEN"/"'$github_token'"/g' "$js"
    perl -pi -e 's/"TRAVIS_CI_TOKEN"/"'$travis_ci_token'"/g' "$js"
done

case "$1" in
    'start' | 'stop' | 'restart')
        for js in $PWD/*-bot/index.js
        do
            forever "$1" "$js"
        done
        ;;
    'bundle')
        for bot in ./*-bot
        do
            (
                builtin cd "$bot"
                npm install &>/dev/null
            ) &
        done
        wait
        ;;
    '')
        printf 'Only replace with token\n'
        ;;
    *)
        forever "$@"
        ;;
esac

exit $?

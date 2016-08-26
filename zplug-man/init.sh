#!/bin/bash

slack_token="$(env | grep '^SLACK_TOKEN' | sed 's/SLACK_TOKEN=//')"
github_token="$(env | grep '^GITHUB_ACCESS_TOKEN' | sed 's/GITHUB_ACCESS_TOKEN=//')"

if [[ -z $slack_token ]] || [[ -z $github_token ]]; then
    printf 'tokens are invalid...\n' >&2
    exit 1
fi

git checkout scripts
for js in ./scripts/*.js
do
    perl -pi -e 's/^(var SLACK_TOKEN = )(.+;)$/$1"'$slack_token'";/g' "$js"
    perl -pi -e 's/^(var GITHUB_ACCESS_TOKEN = )(.+;)$/$1"'$github_token'";/g' "$js"
done

#npm install

case "$1" in
    'start' | 'stop' | 'restart')
        ./node_modules/.bin/forever "$1" ./bin/botkit.js
        ;;
    '')
        printf 'too few arguments\n' >&2
        exit 1
        ;;
    *)
        ./node_modules/.bin/forever "$1"
        ;;
esac

exit $?

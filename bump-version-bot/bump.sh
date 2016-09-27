#!/bin/bash

if [[ -z $_ZPLUG_VERSION ]]; then
    echo "_ZPLUG_VERSION: Is empty" >&2
    exit 1
fi

if [[ ! -d /tmp/zplug ]]; then
    git clone \
        https://github.com/zplug/zplug.git \
        /tmp/zplug
fi

#perl -pi -e 's/^(var SLACK_TOKEN = )(.+;)$/$1"'$slack_token'";/g'

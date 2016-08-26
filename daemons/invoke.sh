#!/bin/bash

export PATH="$PATH:./node_modules/.bin"

npm install

case "$1" in
    r|restart)
        ./node_modules/.bin/forever \
            restart -c node main.js
        ;;
    s|start)
        ./node_modules/.bin/forever \
            start -c node main.js
        ;;
    m|manual)
        node main.js
        ;;
    "")
        echo "too few arguments" >&2
        exit 1
        ;;
    *)
        ./node_modules/.bin/forever "$@"
        ;;
esac

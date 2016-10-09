#!/bin/bash

set -e

work_dir="/tmp/zplug"

if [[ ! -d $work_dir ]]; then
    git clone \
        https://github.com/zplug/zplug \
        "$work_dir" \
        &>/dev/null
    if [[ $? -ne 0 ]]; then
        echo "$work_dir: failed to git clone to" >&2
        exit 1
    fi
fi

git -C "$work_dir" checkout .
git -C "$work_dir" pull
old_version="$(cat "$work_dir"/README.md | grep '^.latest-badge' | sed 's/^.*latest-v//;s/-ca7f85.*$//')"
new_version="$1"

if [[ -z $old_version ]] || [[ -z $new_version ]]; then
    echo "too few arguments" >&2
    exit 1
fi

for file in $work_dir/{README.md,doc/guide/ja/README.md,base/core/core.zsh,doc/VERSION}
do
    perl -pi -e 's/'$old_version'/'$new_version'/g' "$file"
done
git -C "$work_dir" diff 2>&1

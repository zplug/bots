#!/bin/zsh

# is-at-least 4.3.10 $ZSH_VERSION
autoload -Uz is-at-least

work_dir="/tmp/zplug"

if [[ ! -d $work_dir ]]; then
    git clone \
        https://github.com/zplug/zplug.git \
        "$work_dir" \
        &>/dev/null
    if (( $status > 0 )); then
        echo "/tmp/zplug: Is not found" >&2
        exit 1
    fi
fi

git -C "$work_dir" checkout .
old_version="$(cat "$work_dir"/README.md | grep '^.latest-badge' | sed 's/^.*latest-v//;s/-ca7f85.*$//')"
new_version="$1"

if [[ -z $old_version ]]; then
    echo "old_version: Is empty" >&2
    exit 1
fi

if [[ -z $new_version ]]; then
    echo "specify a new version (current: $old_version)" >&2
    exit 1
fi

if is-at-least $new_version $old_version; then
    echo "strange version: (new) $new_version < $old_version (old)" >&2
    exit 1
fi

for file in /tmp/zplug/{README.md,doc/guide/ja/README.md,base/core/core.zsh}
do
    perl -pi -e 's/'$old_version'/'$new_version'/g' "$file"
done
git -C "$work_dir" diff 2>&1

#!/bin/zsh

work_dir="/tmp/zplug"
new_version="$1"
release_note="$2"

if [[ -z $new_version ]]; then
    echo "specify a new version" >&2
    exit 1
fi

cat <<EOF
git -C "$work_dir" remote add origin git@github.com.zplug:zplug/zplug.git
git -C "$work_dir" config user.email "b4b4r07+zplug@gmail.com"
git -C "$work_dir" config user.name "zplug-man"
git -C "$work_dir" add -A
git -C "$work_dir" commit -m "Bump $new_version"
git -C "$work_dir" push origin master

curl --data \
    '{ \
    "tag_name": "'$new_version'", \
    "target_commitish": "master", \
    "name": "Release of version '$new_version'", \
    "body": "'"$release_note"'", \
    "draft": false, \
    "prerelease": false \
    }' \
    "https://api.github.com/repos/zplug/zplug/releases?access_token=ACCESS_TOKEN"
EOF

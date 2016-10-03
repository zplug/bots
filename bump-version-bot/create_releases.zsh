#!/bin/zsh

work_dir="/tmp/zplug"
new_version="$1"
release_note="$(echo "$2" | perl -pe 's/\n/\\n/g')"

if [[ -z $new_version ]]; then
    echo "specify a new version" >&2
    exit 1
fi

git -C "$work_dir" remote set-url origin git@github.com.zplug:zplug/zplug.git &>/dev/null
git -C "$work_dir" config user.email "b4b4r07+zplug@gmail.com"
git -C "$work_dir" config user.name "zplug-man"
git -C "$work_dir" add -A
git -C "$work_dir" commit -m "Bump $new_version"
git -C "$work_dir" push origin master
if (( $status > 0 )); then
    echo "Failed to push origin to master" >&2
    exit 1
else
    echo "Pushed to origin/master!"
fi

API_JSON="$(
printf '{"tag_name":"%s","target_commitish":"master","name":"%s","body":"%s","draft":false,"prerelease":false}' \
    "$new_version" \
    "$new_version" \
    "$release_note"
)"
http_code=$(
curl \
    --data "$API_JSON" \
    --silent --output /dev/stderr --write-out "%{http_code}" \
    https://api.github.com/repos/zplug/zplug/releases?access_token=$GITHUB_ACCESS_TOKEN
)
if (( $http_code == 200 )); then
    echo "Created releases successfully!"
else
    echo "Failed to create releases" >&2
    exit 1
fi

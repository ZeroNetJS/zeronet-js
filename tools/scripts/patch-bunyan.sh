#!/bin/sh

file="$1"

[ -z "$file" ] && file="node_modules/bunyan/bin/bunyan"

#To do the patches in a convinient way use:
# cd node_modules/bunyan/bin && git init && git add bunyan && git commit --no-gpg-sign --author="Nobody <nobody@example.com>" -m "Initial Commit" && git apply ../../../scripts/bunyan-patches/*.patch && git add bunyan && git commit --no-gpg-sign --author="Nobody <nobody@example.com>" -m "Patches"
#Then create a commit and a patch-file (adjust filename if neccesary)
# git commit -m "Stuff" && git patch-file HEAD~

set -x

cp $file bunyan.js
for f in $(dir -w 1 tools/bunyan-patches | sort); do
  patch bunyan.js tools/bunyan-patches/$f
done

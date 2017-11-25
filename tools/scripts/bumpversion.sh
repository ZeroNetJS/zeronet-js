#!/bin/bash

#TODO: replace by better solution

set -e

files=""
op="$PWD"

for file in $(dir -w 1 | grep "^zeronet-"); do
  if [ -d $file ]; then
    files="$files $file"
  fi
done
files="$files . "

newver="$1"

[ -z "$newver" ] && echo "Usage: $0 <new-version>" && exit 2

sed -r "s|version: .*|version: $newver|g" -i snap/snapcraft.yaml
git add snap/snapcraft.yaml

for dir in $files; do
  cd $dir
    for f in package.json package-lock.json; do
      if [ -e $f ]; then
        sed -r 's|^(  "version" *: *").*"|\1'$newver'"|' -i $f
        git add $f
      fi
    done
  cd $op
done

git commit -m "Bump version to $newver"

git tag v$newver

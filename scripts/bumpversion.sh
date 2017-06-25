#!/bin/bash

#TODO: replace by better solution

set -e

files=""

for file in $(dir -w 1 | grep "^zeronet-"); do
  if [ -d $file ]; then
    files="$files $file"
  fi
  npm i
done

files="$files . "

newver="$1"

[ -z "$newver" ] && echo "Usage: $0 <new-version>" && exit 2

for dir in $files; do
  cd $dir
    for f in package.json package-lock.json; do
      sed -r 's|("version" *: *").*"|\1'$newver'"|' -i $f
    done
  cd ..
done

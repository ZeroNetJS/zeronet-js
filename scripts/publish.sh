#!/bin/bash

#TODO: replace by better solution

set -e

files=""

for file in $(dir -w 1 | grep "^zeronet-"); do
  if [ -d $file ]; then
    files="$files $file"
  fi
done

files="$files . "

echo "Publishing $files @ $(cat package.json | grep "version" | sed "s|\"||g" | sed "s|  ||g")"

echo "Sure?"

read foo

[ "$foo" != "yes" ] && echo "Abort." && exit 2

for dir in $files; do
  cd $dir
    npm publish
  cd ..
done

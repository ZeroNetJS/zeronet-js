#!/bin/bash

set -e

op="$PWD"

files=""

for file in $(dir -w 1 | grep "^zeronet-"); do
  if [ -d $file ]; then
    files="$files $file"
  fi
done

for dir in $files; do
  cd $dir
    for f in LICENSE; do
      cp ../$f $f
    done
  cd $op
done

#!/bin/bash

cd $(dirname $(readlink -f $0))

repos=$(cat repos.txt)
files=$(cat sync-files.txt)

mkdir -p tmp

cd tmp

for r in $repos; do
  echo "[SYNC] $r"

  [ ! -e $r ] && git clone git@github.com:ZeroNetJS/$r $r -b master

  cd $r

  git fetch origin
  git pull origin master

  for f in $files; do
    cp ../../../$f .
    git add $f
  done

  git commit -m "misc: Sync repo files"
  git push

  cd ..
done

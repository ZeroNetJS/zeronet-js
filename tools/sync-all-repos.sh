#!/bin/bash

cd $(dirname $(readlink -f $0))

repos=$(cat repos.txt)
files=$(cat sync-files.txt)

mkdir -p tmp

cd tmp

for r in $repos; do
  echo "[SYNC] $r"

  ([ ! -e $r ] && git clone git@github.com:ZeroNetJS/$r $r -b master) || git -C $r pull origin master

  cd $r

  for f in $files; do
    if [ -e ../../sync/$f ]; then
      _f="../../sync/$f"
    else
      _f="../../../$f"
    fi
    cp $_f .
    git add $f
  done

  node ../../sync-pkg-json $PWD/package.json
  git add package.json

  git commit -m "misc: Sync repo files"
  git push

  cd ..
done

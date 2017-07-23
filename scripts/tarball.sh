#!/bin/bash

set -e

op="$PWD"

ex_re() {
  [ ! -z "$1" ] && other="$@" || other=$(cat $op/.gitignore) && ex="--exclude=zeronet-* --exclude=package-lock.json"
  for f in .git .gitignore .travis.yml debug scripts .empty *.yml snap data $other; do
    ex="$ex --exclude=$f"
  done
}

if ([ "$0" = "$BASH_SOURCE" ] || ! [ -n "$BASH_SOURCE" ]);
then

  ex_re
  tar cvfz zeronet.tar.gz $ex --mode="777" . | sed "s|^|zeronet: |g"
  ex_re

  for file in $(dir -w 1 | grep "^zeronet-"); do
    if [ -d $file ]; then
      cd $file
      tar cvfz ../$file.tar.gz $ex . | sed "s|^|$file: |g"
      ex_re
      cd ..
    fi
  done

fi

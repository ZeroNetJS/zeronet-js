#!/bin/bash

set -e

op="$PWD"

ver=$(echo $(cat package.json | grep "version" | sed "s|\"||g" | sed "s|  ||g" | grep " .*" -o) | sed "s|,||g")

ex_re() {
  ex="--exclude=zeronet-* --exclude=package-lock.json --exclude=package.json.bak"
  for f in .git .gitignore .travis.yml debug scripts .empty *.yml snap data $(cat $op/.gitignore); do
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
    cp package.json package.json.bak
    if [ ! -z "$TARBALL_PREFIX" ]; then
      sed -r 's|"zeronet-([a-z-]+)": "file:.+"|"zeronet-\1": "'"$TARBALL_PREFIX"'"|g' -i package.json
    else
      sed -r 's|"zeronet-([a-z-]+)": "file:.+"|"zeronet-\1": "'"$ver"'"|g' -i package.json
    fi
    ex_re
    GZIP=-n tar cvfz ../$file.tar.gz --sort=name --mtime='2015-10-21 00:00Z' --owner=0 --group=0 --numeric-owner $ex . | sed "s|^|$file: |g"
    [ ! -e ../$file.tar.gz ] && GZIP=-n tar cvfz ../$file.tar.gz --mtime='2015-10-21 00:00Z' --owner=0 --group=0 --numeric-owner $ex . | sed "s|^|$file: |g"
    rm package.json
    mv package.json.bak package.json
    cd ..
  fi
done

fi

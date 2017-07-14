#!/bin/bash

set -e

op="$PWD"

files=""

for file in $(dir -w 1 | grep "^zeronet-"); do
  if [ -d $file ]; then
    files="$files $file"
  fi
done

files="$files . "

ver=$(echo $(cat package.json | grep "version" | sed "s|\"||g" | sed "s|  ||g" | grep " .*" -o) | sed "s|,||g")

echo "Publishing $files @ $ver"

for file in . $(dir -w 1 | grep "^zeronet-"); do
  if [ -d $file ]; then
    cd $file
    sed -r 's|"([a-z-]+)": "file:.*"|"\1": "'$ver'"|g' -i package.json
    cd $op
  fi
done

bash scripts/tarball.sh

tarfiles="zeronet.tar.gz"
for file in $files; do
  [ "$file" != "." ] && tarfiles="$tarfiles $file.tar.gz"
done

echo "This will 'npm publish $tarfiles'"

echo "Sure?"

read foo

[ "$foo" != "yes" ] && echo "Abort." && exit 2

tmpfo="/tmp/zjs-publish-$$"

set -x
for f in $tarfiles; do
  rm -rf $tmpfo
  mkdir -p $tmpfo
  cd $tmpfo
  tar xvfz $op/$f
  npm publish
done
set +x

cd $op

for file in . $(dir -w 1 | grep "^zeronet-"); do
  if [ -d $file ]; then
    cd $file
    sed -r 's|"(zeronet-[a-z-]+)": ".*"|"\1": "file:\1"|g' -i package.json
    cd $op
  fi
done

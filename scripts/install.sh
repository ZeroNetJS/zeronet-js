#!/bin/bash

set -ex

for file in $(dir -w 1 | grep "^zeronet-"); do
  if [ -d $file ]; then
    cd $file
    npm i
    cd ..
  fi
  npm i
done

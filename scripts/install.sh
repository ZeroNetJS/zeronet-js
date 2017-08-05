#!/bin/bash

set -e

npm i

for file in $(dir -w 1 | grep "^zeronet-"); do
  if [ -d $file ]; then
    cd $file
    npm i
    cd ..
  fi
done

#!/bin/bash

set -e

npm i

for file in $(dir -w 1 | grep "^zeronet-"); do
  if [ -d $file ]; then
    cd $file
    if [ ! -z "$NPMI_FOREACH" ]; then
      rm -rf node_modules
      npm i
    else
      rm -rf node_modules package-lock.json
      ln -sf ../node_modules .
    fi
    cd ..
  fi
done

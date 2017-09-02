#!/bin/bash

set -e

op="$PWD"

for file in . $(dir -w 1 | grep "^zeronet-"); do
  if [ -d $file ]; then
    cd $file
    rm -rf node_modules package-lock.json
    ncu -u -a
    cd $op
  fi
done

bash scripts/install.sh

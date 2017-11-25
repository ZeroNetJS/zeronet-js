#!/bin/bash

git grep 'require("zeronet' | grep "^zeronet-" | sed -r "s|^zeronet-([a-z-]+).+require\\(\"zeronet-([a-z-]+).+$|zeronet-\1 zeronet-\2|g" | sort | uniq

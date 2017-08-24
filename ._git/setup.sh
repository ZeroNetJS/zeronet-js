#!/bin/sh

rm -rf .git/hooks
ln -s ../._git/hooks .git/hooks
echo "Hooks ready!"

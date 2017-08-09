#!/bin/bash

echo "Starting zeronet python in docker container..."
container=$(docker run -d -p 13344:15441 -p 127.0.0.1:44110:43110 nofish/zeronet)

docker logs -f $container &

sleep 2s #wait for znpy to start

echo "Running interop tests..."
mocha interop
ex=$?

echo "Done!"

echo "Stopping znpy..."
docker kill $container
docker rm $container

[ $ex -ne 0 ] && echo "TESTS FAILED" && exit $ex
echo "TESTS OK"

#!/bin/bash

set -e

npx ganache-cli --gasLimit 47000000000  -e 1000000 2> /dev/null 1> /dev/null &
sleep 5 # to make sure ganache-cli is up and running before compiling
rm -rf build
npx truffle compile
npx truffle migrate --reset --network development
npx truffle test

kill -9 $(lsof -t -i:8545)
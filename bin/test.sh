#!/bin/bash

set -e

ganache-cli --gasLimit 47000000000 2> /dev/null 1> ~/ganache-cli.txt & sleep 5
# ganache-cli --gasLimit 47000000000 2> /dev/null 1> /dev/null &
# sleep 5 # to make sure ganache-cli is up and running before compiling
rm -rf build
truffle compile
truffle migrate --reset --network development
truffle test
cat ~/ganache-cli.txt
kill -9 $(lsof -t -i:8545)
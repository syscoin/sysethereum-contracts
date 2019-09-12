#!/bin/sh

# rm -rf build
# truffle compile
# truffle migrate --reset --network rinkeby

truffle exec  --network rinkeby scripts/init_contracts_integration.js

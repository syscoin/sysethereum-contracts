#!/bin/sh

# rm -rf build
# truffle compile
# truffle migrate --reset --network rinkeby

truffle exec  --network mainnet scripts/init_contracts_integration.js
truffle exec  --network mainnet scripts/debug.js

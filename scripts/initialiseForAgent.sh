#!/bin/sh

# rm -rf build
# truffle compile
# truffle migrate --reset --network integrationSyscoinRegtest

truffle exec  --network integrationSyscoinRegtest scripts/init_contracts_local.js
truffle exec  --network integrationSyscoinRegtest scripts/debug.js

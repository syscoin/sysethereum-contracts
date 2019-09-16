#!/bin/sh

#export WEB3JBIN=/usr/local/bin/web3j
export WEB3JBIN=web3j
export CONTRACTS=./build/contracts
export ETHNETWORK=rinkeby
export OUTPACKAGE=org.sysethereum.agents.contract

rm -rf build
truffle compile
truffle migrate --reset --network $ETHNETWORK

$WEB3JBIN truffle generate --solidityTypes $CONTRACTS/SyscoinClaimManager.json -o ./ -p $OUTPACKAGE
$WEB3JBIN truffle generate --solidityTypes $CONTRACTS/SyscoinBattleManager.json -o ./ -p $OUTPACKAGE
$WEB3JBIN truffle generate --solidityTypes $CONTRACTS/SyscoinSuperblocks.json -o ./ -p $OUTPACKAGE

truffle exec  --network $ETHNETWORK scripts/init_contracts_integration.js
#truffle run verify SyscoinBattleManager SyscoinClaimManager SyscoinSuperblocks SyscoinERC20Manager --network $ETHNETWORK
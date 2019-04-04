#!/bin/sh

export WEB3JBIN=/usr/local/bin/web3j
export CONTRACTS=./build/contracts
export ETHNETWORK=integrationSyscoinRegtest
export OUTPACKAGE=org.sysethereum.agents.contract

rm -rf build
truffle compile
truffle migrate --reset --network $ETHNETWORK

$WEB3JBIN truffle generate $CONTRACTS/SyscoinClaimManager.json -o ~/agents/src/main/java/ -p $OUTPACKAGE
$WEB3JBIN truffle generate $CONTRACTS/SyscoinBattleManager.json -o ~/agents/src/main/java/ -p $OUTPACKAGE
$WEB3JBIN truffle generate $CONTRACTS/SyscoinSuperblocks.json -o ~/agents/src/main/java/ -p $OUTPACKAGE

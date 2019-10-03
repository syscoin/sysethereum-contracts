#!/bin/sh

#export WEB3JBIN=/usr/local/bin/web3j
export WEB3JBIN=web3j
export CONTRACTS=./build/contracts
export ETHNETWORK=rinkeby
export OUTPACKAGE=org.sysethereum.agents.contract

rm -rf build
# https://www.npmjs.com/package/npx#description
npx truffle compile
npx truffle migrate --reset --network $ETHNETWORK

$WEB3JBIN truffle generate --solidityTypes $CONTRACTS/SyscoinClaimManager.json -o ./ -p $OUTPACKAGE
$WEB3JBIN truffle generate --solidityTypes $CONTRACTS/SyscoinBattleManager.json -o ./ -p $OUTPACKAGE
$WEB3JBIN truffle generate --solidityTypes $CONTRACTS/SyscoinSuperblocks.json -o ./ -p $OUTPACKAGE


npx oz verify SyscoinBattleManager --remote etherscan --api-key $ETHERSCAN --optimizer --optimizer-runs 200 --network $ETHNETWORK
npx oz verify SyscoinClaimManager --remote etherscan --api-key $ETHERSCAN --optimizer --optimizer-runs 200 --network $ETHNETWORK
npx oz verify SyscoinSuperblocks --remote etherscan --api-key $ETHERSCAN --optimizer --optimizer-runs 200 --network $ETHNETWORK
npx oz verify SyscoinERC20Manager --remote etherscan --api-key $ETHERSCAN --optimizer --optimizer-runs 200 --network $ETHNETWORK
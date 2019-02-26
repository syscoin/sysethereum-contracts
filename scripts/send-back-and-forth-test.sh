# Test sending syscoin to eth and back
# Tested on Mac OSX only

# Declare variables
syscoinQtProcessName=Syscoin-Qt
syscoinQtDatadir=/Users/youruser/Library/Application\ Support/Syscoin
syscoinQtExecutable=/Applications/Syscoin-Qt.app/Contents/MacOS/Syscoin-Qt
syscoinQtRpcuser=aaa
syscoinQtRpcpassword=bbb
agentCodeDir=/path/agentCodeDir
agentDataDir=/path/agentDataDir
sysethereumContractsCodeDir=/path/sysethereumContractsCodeDir

# Print instructions on the console
set -o xtrace
# Stop syscoin-qt
killall $syscoinQtProcessName
sleep 3s
# Replace syscoin-qt regtest datadir with the prepared db
rm -rf "$syscoinQtDatadir/regtest/"
unzip "$agentCodeDir/data/syscoin-qt-regtest-datadir.zip" -d "$syscoinQtDatadir" > /dev/null 2>&1
# Start syscoin-qt
$syscoinQtExecutable -regtest -debug -server -listen -rpcuser=$syscoinQtRpcuser -rpcpassword=$syscoinQtRpcpassword -rpcport=41200 &
sleep 10s
# Mine a syscoin block so syscoin-qt is fully up and running
curl --user $syscoinQtRpcuser:$syscoinQtRpcpassword  --data-binary '{"jsonrpc": "1.0", "id":"curltest", "method": "generate", "params": [1] }' -H 'content-type: text/plain;' http://127.0.0.1:41200/
# Clear agent data dir
rm -rf $agentDataDir/*
# Restart ganache
kill $(ps aux | grep ganache | grep -v grep | awk '{print $2}')
sleep 1s
ganache-cli --gasLimit 400000000000 > ganachelog.txt &
# Remove compiled contract to force recompiling
rm -rf $sysethereumContractsCodeDir/build/contracts/
# Compile and deploy contracts
truffle deploy --network integrationSyscoinRegtest | grep Error
# Init contracts: initial syscoin header
truffle exec  --network integrationSyscoinRegtest scripts/init_contracts_local.js 
# Print debug.js status
truffle exec  --network integrationSyscoinRegtest scripts/debug.js 
echo "Please, start the agent..."
# Wait for agent to relay syscoin lock tx to eth and syscointokens minted
truffle exec  --network integrationSyscoinRegtest scripts/wait_token_balance.js 
# Prepare sender address to do unlocks
truffle exec  --network integrationSyscoinRegtest scripts/prepare_sender.js
for i in $(seq 1 2); do 
	# Send eth unlock tx 
	node ../sysethereum-tools/user/unlock.js --ethnetwork ganacheSyscoinRegtest --json $sysethereumContractsCodeDir/build/contracts/SyscoinToken.json --sender 0xd2394f3fad76167e7583a876c292c86ed10305da --receiver ncbC7ZY1K9EcMVjvwbgSBWKQ4bwDWS4d5P --value 300000000
	# Print debug.js status
	truffle exec  --network integrationSyscoinRegtest scripts/debug.js 
	# Mine 5 eth blocks so unlock eth tx has enought confirmations
	for j in $(seq 1 5); do 
		curl -X POST --data '{"jsonrpc":"2.0","method":"evm_mine","params":[],"id":74}' http://localhost:8545;
	done
	# Wait for Eth to Syscoin agent to sign and broadcast syscoin unlock tx
	sleep 30s
	# Mine 10 syscoin blocks so syscoin unlock tx has enough confirmations
	curl --user $syscoinQtRpcuser:$syscoinQtRpcpassword  --data-binary '{"jsonrpc": "1.0", "id":"curltest", "method": "generate", "params": [10] }' -H 'content-type: text/plain;' http://127.0.0.1:41200/
done
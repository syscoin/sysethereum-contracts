#!/usr/bin/env node

const fs = require("fs");
const solc = require('solc');
const linker = require('solc/linker');
let Web3 = require('web3');

let web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

let input = {
    'SyscoinParser/SyscoinMessageLibrary.sol' : fs.readFileSync('./contracts/SyscoinParser/SyscoinMessageLibrary.sol', 'utf8'),
    'ISyscoinRelay.sol' : fs.readFileSync('./contracts/ISyscoinRelay.sol', 'utf8'),
    'SyscoinTransactionProcessor.sol' : fs.readFileSync('./contracts/SyscoinTransactionProcessor.sol', 'utf8'),
    'SyscoinRelay.sol' : fs.readFileSync('./contracts/SyscoinRelay.sol', 'utf8'),
    'SyscoinRelayForTests.sol' : fs.readFileSync('./contracts/SyscoinRelayForTests.sol', 'utf8'),
    'SyscoinSuperblocks.sol' : fs.readFileSync('./contracts/SyscoinSuperblocks.sol', 'utf8'),
    'SyscoinBattleManager.sol' : fs.readFileSync('./contracts/SyscoinBattleManager.sol', 'utf8'),
    'SyscoinClaimManager.sol' : fs.readFileSync('./contracts/SyscoinClaimManager.sol', 'utf8'),
    'SyscoinDepositsManager.sol' : fs.readFileSync('./contracts/SyscoinDepositsManager.sol', 'utf8'),
    'SyscoinErrorCodes.sol' : fs.readFileSync('./contracts/SyscoinErrorCodes.sol', 'utf8'),
    'token/SyscoinToken.sol' : fs.readFileSync('./contracts/token/SyscoinToken.sol', 'utf8'),
    'token/Token.sol' : fs.readFileSync('./contracts/token/Token.sol', 'utf8'),
    'token/StandardToken.sol' : fs.readFileSync('./contracts/token/StandardToken.sol', 'utf8'),
    'token/HumanStandardToken.sol' : fs.readFileSync('./contracts/token/HumanStandardToken.sol', 'utf8'),
    'token/Set.sol' : fs.readFileSync('./contracts/token/Set.sol', 'utf8')
};

let compiledContract = solc.compile({sources: input, gasLimit: "8990000000000000"}, 1);
let abi;

let bytecode;
let gasEstimate = 0;

let deployedContracts = [
    'SyscoinRelay.sol:SyscoinRelay',
    'SyscoinSuperblocks.sol:SyscoinSuperblocks',
    'SyscoinClaimManager.sol:SyscoinClaimManager',
    'SyscoinTransactionProcessor.sol:SyscoinTransactionProcessor'
];

for (i in deployedContracts) {
    d = deployedContracts[i];
    // console.log(compiledContract, Object.keys(compiledContract.contracts));
    bytecode = '0x' + compiledContract.contracts[d].bytecode;
    let gas = web3.eth.estimateGas({data: bytecode, gasLimit: "8990000000000000"});
    console.log("Gas for " + d + ": " + gas);
    gasEstimate += gas;
}


bytecode = '0x' + compiledContract.contracts['token/SyscoinToken.sol:SyscoinToken'].bytecode;
bytecode = linker.linkBytecode(bytecode, {'token/Set.sol:Set': '0x0'});

let gas = web3.eth.estimateGas({data: bytecode});
console.log("Gas for token/SyscoinToken.sol:SyscoinToken: " + gas);
gasEstimate += gas;

console.log("Total gas: " + gasEstimate);

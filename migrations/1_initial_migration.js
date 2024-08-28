var Migrations = artifacts.require("./Migrations.sol");

module.exports = function(deployer) {
  console.log('Deploying migrations...');
  deployer.deploy(Migrations, {gas: 300000});
};

var lightwallet = require('eth-lightwallet');
var Web3 = require('web3');
var fs = require('fs');
var async = require('async');
var assert = require('assert');

var myArgs = require('optimist').argv;
var HookedWeb3Provider = require("hooked-web3-provider");


var config = require('./config.js').config;

var TestRPC = require("ethereumjs-testrpc");
var TestRPCServer;


var gasPrice;
var global_keystore;
var account;

var btconfig = {};

if (!fs.existsSync(config.walletfile)) {
  console.log('file', config.walletfile, 'not found..');

  // maak nieuwe wallet en exit
  var secretSeed = lightwallet.keystore.generateRandomSeed();
  lightwallet.keystore.deriveKeyFromPassword(config.walletpassword, function(err, pwDerivedKey) {

    global_keystore = new lightwallet.keystore(secretSeed, pwDerivedKey);
    global_keystore.generateNewAddress(pwDerivedKey, 2);
    var keyStoreString = global_keystore.serialize();

    fs.writeFileSync(config.walletfile, keyStoreString);
    console.log("The keystore was saved! ==> ", config.walletfile);

    account = global_keystore.getAddresses()[0];

    console.log('Your main account is ', account);
    console.log('now send this guy some ether in your geth client please');
    console.log("eth.sendTransaction({from:eth.coinbase, to:'" + global_keystore.getAddresses()[0] + "',value: web3.toWei(500, \"ether\")})");
    console.log("eth.sendTransaction({from:eth.coinbase, to:'" + global_keystore.getAddresses()[1] + "',value: web3.toWei(500, \"ether\")})");

    console.log("Goodbye!");
    process.exit();
  });


} else {


  console.log('Keystore file found.');
  var contents = fs.readFileSync(config.walletfile, 'utf8');
  global_keystore = lightwallet.keystore.deserialize(contents);



  global_keystore.passwordProvider = function(callback) {
    callback(null, config.walletpassword);
  };

  account = global_keystore.getAddresses()[0];
  console.log('Main account is ', account);

  lightwallet.keystore.deriveKeyFromPassword(config.walletpassword, function(err, pwDerivedKey) {


    var publickey = global_keystore.getAddresses()[0];
    var privatekey = global_keystore.exportPrivateKey(publickey, pwDerivedKey);

    console.log('your PK = ', privatekey);

    // create the testserver with the account in our wallet file as the first and only 
    // provisioned account.

    var TestRPCServer = TestRPC.server({
      accounts: [{
        secretKey: '0x' + privatekey,
        balance: 1000e18
      }]
    });

    TestRPCServer.listen(6677, function(err, blockchain) {

      config.web3host = "http://localhost:6677";

      web3 = new Web3();
      var provider = new HookedWeb3Provider({
        host: config.web3host,
        transaction_signer: global_keystore
      });
      web3.setProvider(provider);

      web3.eth.getGasPrice(function(err, result) {

        gasPrice = result.toNumber(10);
        console.log('gasprice is ', gasPrice);

        console.log(myArgs._[0]);
        var command = myArgs._[0];
        switch (command) {
          default: console.log('usage node bootstrap.js <bootstrap>');
          break;
          case "bootstrap":


              async.series({
                deployCoinContract: function(callback) {
                  deployCoinContract(function(err, res) {
                    callback(err, res);
                  });
                },
                deployFarmingContract: function(callback) {
                  deployFarmingContract(function(err, res) {
                    callback(err, res);
                  });
                },
                // deployTagContracts: function(callback) {
                //   btconfig.tags = [];
                //   async.eachSeries(config.tags, deployTagContract, function(err, results) {
                //     callback(err);
                //   });
                // },
              },
              function(err, results) {
                console.log('Finished');
                console.log(btconfig);
              });


            break;


        }
      });
    });
  });

}

function deployCoinContract(cb) {
  console.log('deploy coin contract');
  var contractjson = require('../app/contracts/blocktubeCoin.json');

  // uint256 initialSupply,
  //       string tokenName,
  //       uint8 decimalUnits,
  //       uint256 _minEthbalance,
  //       string tokenSymbol,
  //       string versionOfTheCode

  var allowanceContract = this.web3.eth.contract(contractjson.abi);
  var allowance = allowanceContract.new(10000000e18, 'blocktubecoin', 18, 0, 'BLTC', {
    from: fixaddress(account),
    data: contractjson.bytecode,
    gas: 3000000,
    gasPrice: gasPrice,
    gasLimit: 3000000,
    //    value: this.value * 1e18
  }, function(e, contract) {
    if (e) {
      console.log('error creating contract', e);
      return;
    }

    if (typeof contract.address !== 'undefined') {
      btconfig.coincontract = contract.address;
      console.log('contract deployed at ', btconfig.coincontract);
      cb();
    }
  }.bind(this));
}


function deployFarmingContract(cb) {
  console.log('deploy coin contract');
  var contractjson = require('../app/contracts/blocktubeFarming.json');


  var contract = this.web3.eth.contract(contractjson.abi);
  var contractat = contract.new({
    from: fixaddress(account),
    data: contractjson.bytecode,
    gas: 3000000,
    gasPrice: gasPrice,
    gasLimit: 3000000,
    //    value: this.value * 1e18
  }, function(e, contract) {
    if (e) {
      console.log('error creating contract', e);
      return;
    }

    if (typeof contract.address !== 'undefined') {
      btconfig.farmingcontract = contract.address;
      console.log('contract deployed at ', contract.address);

      // whitelist the farmer contract to mint coins.
    
      var contractjson = require('../app/contracts/blocktubeCoin.json');

      // uint256 initialSupply,
      //       string tokenName,
      //       uint8 decimalUnits,
      //       uint256 _minEthbalance,
      //       string tokenSymbol,
      //       string versionOfTheCode

      var contract = this.web3.eth.contract(contractjson.abi);
      var myContractInstance = contract.at(btconfig.coincontract);

      var allowance = myContractInstance.addToWhitelist(btconfig.farmingcontract, {
        from: fixaddress(account),
        data: contractjson.bytecode,
        gas: 3000000,
        gasPrice: gasPrice,
        gasLimit: 3000000,
      }, function(e, txhash) {
        if (e) {
          console.log('error creating contract', e);
          return;
        }

        console.log('tx hash = ',txhash);
        cb();

      }.bind(this));


    }
  }.bind(this));
}



function deployTagContract(tagname, cb) {
  console.log('deploy tag contract');
  var contractjson = require('../app/contracts/blocktubeTag.json');

  var allowanceContract = this.web3.eth.contract(contractjson.abi);
  var allowance = allowanceContract.new(tagname, {
    from: fixaddress(account),
    data: contractjson.bytecode,
    gas: 3000000,
    gasPrice: gasPrice,
    gasLimit: 3000000,
    //    value: this.value * 1e18
  }, function(e, contract) {
    if (e) {
      console.log('error creating contract', e);
      return;
    }

    if (typeof contract.address !== 'undefined') {
      btconfig.tags.push({
        tagname: tagname,
        contractaddress: contract.address
      });
      var contractaddress = contract.address;
      console.log('contract for tag', tagname, 'deployed at ', contractaddress);
      cb();
    }
  }.bind(this));
}

function waitTx(txHash, callback) {

  if (config.waittx) {

    /*
     * Watch for a particular transaction hash and call the awaiting function when done;
     */
    var blockCounter = 15;
    // Wait for tx to be finished
    var filter = this.web3.eth.filter('latest').watch(function(err, blockHash) {
      if (blockCounter <= 0) {
        filter.stopWatching();
        filter = null;
        console.warn('!! Tx expired !!');
        if (callback)
          return callback(false);
        else
          return false;
      }
      // Get info about latest Ethereum block
      var block = this.web3.eth.getBlock(blockHash);
      --blockCounter;
      console.log('We welcome on stage: Block ', block.number);
      // Found tx hash?
      if (block.transactions.indexOf(txHash) > -1) {
        // Tx is finished
        filter.stopWatching();
        filter = null;
        if (callback)
          return callback(true);
        else
          return true;
        // Tx hash not found yet?
      } else {
        // console.log('Waiting tx..', blockCounter);
      }
    }.bind(this));
  } else {
    return callback(true);
  }
}


function fixaddress(address) {
  function strStartsWith(str, prefix) {
    return str.indexOf(prefix) === 0;
  }
  if (!strStartsWith(address, '0x')) {
    return ('0x' + address);
  }
  return address;
}
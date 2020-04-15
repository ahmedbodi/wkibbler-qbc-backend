var express = require("express");
var fs = require('fs');
var bigi = require('bigi');
var lib = require('genesis-js')
var request = require('request');
var bitcore = require('bitcore-lib')
var app = express();

// Define blockbook url
const blockBookUrl = 'http://155.138.220.104:11889'


app.listen(3001, () => {
 console.log("Server running on port 3001");
});


app.get("/keypair/qbc/:data", (req, res, next) => {
  var data = req.params.data;
  var d = bigi.fromBuffer(data);
  var keyPair = new lib.ECPair(d, null, {network: lib.networks.qbc});
  var json = {
    address: keyPair.getAddress(),
    privateKey: keyPair.toWIF()
  }
  res.send(json)
});


app.get("/send/qbc/:data", (req, res, next) => {

  global.response = res;
  var txInfo = JSON.parse(req.params.data);

  info = {
    sendAddress: txInfo.send,
    fromAddress: txInfo.from,
    privKey: txInfo.privKey,
    amount: txInfo.amount,
    fee: 31543,
    balance: txInfo.balance * 100000000
  }

  var sendAdd = info.sendAddress;
  var sendAddress = sendAdd.replace(/\s+/g, '');

    if (sendAddress !== "" && info.amount > 0){
    var amSats = info.amount * 100000000;
    var totalSats = amSats + 31543;
    var totalRound = Math.ceil(totalSats);

    if (info.balance >= totalSats){
      var key = params.lib.ECPair.fromWIF(info.privKey, lib.networks.qbc);
      request(`${blockBookUrl}/api/v1/utxo/${info.fromAddress}`, { json: true }, (err, res) => {
        var utxos = res.body;
          var targets = [
            {
              address: 'moKyssgHDXPfgW7AmUgQADrhtYnJLWuTGu',
              satoshis: totalRound
            }
          ]
        var feeRate = 0;
        var coinSelect = require('coinselect')
        let { inputs, outputs, fee } = coinSelect(utxos, targets, feeRate);
        var builder = new params.lib.TransactionBuilder(lib.networks.qbc);
        var array = [];
        inputs.forEach(change => array.push(change.satoshis));
        const add = (a, b) => a + b;
        const sum = array.reduce(add)
        var changeAm = sum - totalRound;
        inputs.forEach(input => builder.addInput(input.txid, input.vout));
        builder.addOutput(sendAddress , Math.ceil(amSats));
        builder.addOutput(info.fromAddress, changeAm);
        inputs.forEach((v,i) => {builder.sign(i, key)})
        var txhex = builder.build().toHex();
        console.log(txhex)
        request(`${blockBookUrl}/api/v2/sendtx/${txhex}`, { json: true }, (err, res, body) => {
          console.log(body.result)
          var str = JSON.stringify(body).startsWith("{");
          if (str == true){
            global.response.send({messageCode: 1, message: body.result, alertCode: 2})
       } else {
         res.send({messageCode: 2, alertCode: 1})
       }
       });
      //end here
        });
    } else {
      res.send({messageCode: 3, alertCode: 1})
    }
  } else {
    res.send({messageCode: 4, alertCode: 1})
  }

});

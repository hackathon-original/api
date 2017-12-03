let chave = 'Z5n0nOnYh15fK5rtP0HBY6Af8XMGXL5RGIJc0Y1THL8';
let senha = 'DcEByzsSzlfxuoq';
let segredo = '5TDeOgwM7Gw1CPc83lcXeJaL0JTHkmAYjj8Ll4JIA5g';

var BlinkTradeRest = require("blinktrade").BlinkTradeRest;

function trade() {
  let blinktrade = new BlinkTradeRest({ prod: true, currency: "BRL" });
  return blinktrade.ticker().then(ticker => ({ buy: ticker.buy, sell: ticker.sell }));
}

function convertFromBtc(currency, amount) {
  currency = currency || "BRL";
  amount = amount || 1;

  let blinktrade = new BlinkTradeRest({ prod: true, currency });
  return blinktrade.ticker()
    .then(t => t.buy)
    .then(v => amount / v);
}

function convertToBtc(currency, amount) {
  currency = currency || "BRL";
  amount = amount || 1;

  let blinktrade = new BlinkTradeRest({ prod: true, currency });
  return blinktrade.ticker()
    .then(t => t.buy)
    .then(buy => amount * buy);
}

module.exports = {
  trade,
  convertFromBtc,
  convertToBtc
}
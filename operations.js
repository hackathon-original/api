let cc_debts = [];
let rewards_debts = [];

function addAccountOperation(amount) {
  cc_debts.push(amount);
}

function addRewardsOperation(amount) {
  rewards_debts.push(amount);
}

function calculateRewardsOps(balance) {
  balance = balance || 0;
  return balance + rewards_debts.reduce((total, value) => total += value);
}

function calculateAccountOps(balance) {
  balance = balance || 0;
  return balance + cc_debts.reduce((total, value) => total += value);
}

module.exports = {
  addAccountOperation,
  addRewardsOperation,
  calculateAccountOps,
  calculateRewardsOps
}
/*==================================================
  Modules
==================================================*/

  const sdk = require('../../sdk');
  const BigNumber = require('bignumber.js');
  const _ = require('underscore');
  const abi = require('./abi');

/*==================================================
  Main
==================================================*/

  async function tvl (timestamp, block) {
    const balances = {};

    /* pull kyber market addresses */
    const reserve1Addresses = (await sdk.api.abi.call({
      target: abi['networkAddress'],
      abi: abi['getReserves'],
      block
    })).output;

    const reserve2Addresses =
      block > 9003563
        ? (
            await sdk.api.abi.call({
              target: abi["networkAddress2"],
              abi: abi["getReserves"],
              block,
            })
          ).output
        : [];
    const reserveAddresses = _.uniq(reserve1Addresses.concat(reserve2Addresses));

    const kyberTokens = (await sdk.api.util.kyberTokens()).output;

    let balanceOfCalls = [];
    _.forEach(reserveAddresses, (reserveAddress) => {
      balanceOfCalls = [
        ...balanceOfCalls,
        ..._.map(kyberTokens, (data, address) => ({
          target: reserveAddress,
          params: address
        }))
      ];
    });

    const balanceOfResult = await sdk.api.abi.multiCall({
      block,
      calls: balanceOfCalls,
      abi: abi['getBalance'],
    });

    /* combine token volumes on multiple markets */
    _.forEach(balanceOfResult.output, (result) => {
      let balance = new BigNumber(result.output || 0);
      if (balance <= 0) return;

      let asset = result.input.params[0];
      let total = balances[asset];

      if (total) {
        balances[asset] = balance.plus(total).toFixed();
      } else {
        balances[asset] = balance.toFixed();
      }
    });

    balances['0x0000000000000000000000000000000000000000'] = balances['0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'];
    delete balances['0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'];
    return (await sdk.api.util.toSymbols(balances)).output;
  }

/*==================================================
  Exports
==================================================*/

  module.exports = {
    name: 'Kyber',
    token: 'KNC',
    category: 'DEXes',
    start: 1546560000,  // Jan-03-2019 11:37:38 AM +UTC
    tvl,
  };

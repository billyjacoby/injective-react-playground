import { getInjectiveAddress } from '@injectivelabs/sdk-ts';
import { BaseWalletStrategy } from '@injectivelabs/wallet-core';
import { Wallet } from 'ethers';
import React from 'react';
import { PRIV_KEY, SigObject } from '../../App';

export const Authorization = ({
  wallet,
  setSignature,
}: {
  wallet?: BaseWalletStrategy;
  setSignature: (sig: SigObject) => void;
}) => {
  async function authorize() {
    const address = await wallet?.getAddresses();
    if (!address?.[0]) {
      console.error('No addresses connected');
      return;
    }
    const injAddress = getInjectiveAddress(address[0]);
    const message = 'this is a test message';
console.log('🪵 | authorize | message:', message);
    const signature = await wallet?.signArbitrary(address[0], message);

    if (!signature) {
      return console.error('No signature found');
    }

    const eWallet = new Wallet(PRIV_KEY);
    console.log(message);
    const sig = await eWallet.signMessage(message);
    console.log(eWallet.address)
    console.log('ewallet: ', sig);
    console.log('iwallet: ', signature);
    
  }

  return <button onClick={authorize}>authenticate</button>;
};

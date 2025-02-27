import { getInjectiveAddress } from '@injectivelabs/sdk-ts';
import { BaseWalletStrategy } from '@injectivelabs/wallet-core';
import React from 'react';
import { SigObject } from '../../App';

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
    console.log('🪵 | retrieveNonce | injAddress:', injAddress);
    const message = `In order to enable notifications for you address you must adhere to the terms of service.
    
Click to sign in and accept the Helix Mobile Terms of Service and Privacy Policy.

This request will not trigger a blockchain transaction or cost any gas fees.

Wallet Address:
${injAddress}

Nonce:
${crypto.randomUUID()}
`;
    console.log('🪵 | retrieveNonce | message:', message);
    const signature = await wallet?.signArbitrary(address[0], message);
    console.log('🪵 | retrieveNonce | signedBytes:', signature);

    if (!signature) {
      return console.error('No signature found');
    }

    setSignature({
      address: injAddress,
      message,
      signature,
    });
  }

  return <button onClick={authorize}>authenticate</button>;
};

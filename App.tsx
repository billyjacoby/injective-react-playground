import { BaseWalletStrategy, MsgBroadcaster } from '@injectivelabs/wallet-core';
import { EvmWalletStrategy } from '@injectivelabs/wallet-evm';
import React from 'react';

import { Wallet } from '@injectivelabs/wallet-base';

import { getInjectiveAddress } from '@injectivelabs/sdk-ts';
import './App.css';
import { NETWORK_INFO } from './constants';
import { Authorization } from './src/components/Authorization';

import { MarketOrder } from './src/components/MarketOrder';
import { injectiveClients } from './src/injective-clients';

export type SigObject = {
  address: string;
  message: string;
  signature: string;
};


function App() {
  const [wallet, setWallet] = React.useState<BaseWalletStrategy | undefined>();

  const [signature, setSignature] = React.useState<SigObject | undefined>();
  const [injAddress, setInjAddress] = React.useState<string | undefined>();
  const [address, setAddress] = React.useState<string | undefined>();
  const [broadcaster, setBroadcaster] = React.useState<MsgBroadcaster | undefined>();
  async function onLoad() {
    const strategy = new EvmWalletStrategy({
      chainId: NETWORK_INFO.chainId,
      wallet: Wallet.Metamask,
      ethereumOptions: {
        ethereumChainId: NETWORK_INFO.ethereumChainId!,
      }
    })
    const _wallet = new BaseWalletStrategy({
      chainId: NETWORK_INFO.chainId,
      wallet: Wallet.Metamask,
      strategies: {
        [Wallet.Metamask]: strategy,
      }
    });

    const _broadcaster = new MsgBroadcaster({
      network: injectiveClients.network,
      walletStrategy: _wallet,
      ethereumChainId: NETWORK_INFO.ethereumChainId!
    })

    
    
    console.log('🪵 | onLoad | _wallet:', _wallet);
    const addresses = await _wallet.getAddresses();
    console.log('🪵 | onLoad | address:', addresses);
    setBroadcaster(_broadcaster);
    setAddress(addresses?.[0]);
    setInjAddress(getInjectiveAddress(addresses?.[0]));
    setWallet(_wallet);
  }

  React.useEffect(() => {
    onLoad();
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-5xl ">Injective React</h1>
      <div className="flex flex-col gap-2">
        {signature && <p>Signature saved!</p>}
        {!signature && <p className="text-red-500">Signature required!</p>}
        <Authorization wallet={wallet} setSignature={setSignature} />
        {/* <SendInj wallet={wallet} address={injAddress} /> */}
        {broadcaster && address && <MarketOrder address={address} broadcaster={broadcaster} />}
      </div>
    </div>
  );
}

export default App;

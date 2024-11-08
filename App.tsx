import {
  getNetworkChainInfo,
  Network
} from '@injectivelabs/networks';
import { BaseWalletStrategy } from '@injectivelabs/wallet-core';
import { PrivateKeyWalletStrategy } from '@injectivelabs/wallet-private-key/src/index';
import React from 'react';

import { Wallet } from '@injectivelabs/wallet-base';

import './App.css';
import { Authorization } from './src/components/Authorization';
import { Positions } from './src/components/Positions';

export type SigObject = {
  address: string;
  message: string;
  signature: string;
};

export const PRIV_KEY = "9daa554fa955d8c584254f147688b65abc2a60bb3e308bf22d17c5fec73d12e6";
export const PUB_KEY = '0x697e62225Dd22A5afcAa82901089b2151DAEB706'

function App() {
  const [wallet, setWallet] = React.useState<BaseWalletStrategy | undefined>();
  const network = Network.TestnetSentry;
  const networkInfo = getNetworkChainInfo(network);

  const [signature, setSignature] = React.useState<SigObject | undefined>();

  async function onLoad() {
    const strategy = new PrivateKeyWalletStrategy({
      chainId: networkInfo.chainId,
      privateKey: PRIV_KEY,
      ethereumOptions: {
        ethereumChainId: networkInfo.ethereumChainId!,
      }
    })
    const _wallet = new BaseWalletStrategy({
      chainId: networkInfo.chainId,
      wallet: Wallet.PrivateKey,
      strategies: {
        [Wallet.PrivateKey]: strategy,
      }
    });
    console.log('🪵 | onLoad | _wallet:', _wallet);
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
        <Positions signature={signature} />
      </div>
    </div>
  );
}

export default App;

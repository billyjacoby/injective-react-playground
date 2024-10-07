import React from 'react';
import { Wallet, WalletStrategy } from '@injectivelabs/wallet-ts';
import './App.css';
import {
  getNetworkChainInfo,
  getNetworkEndpoints,
  Network,
} from '@injectivelabs/networks';
import { Authorization } from './src/components/Authorization';
import { Positions } from './src/components/Positions';

export type SigObject = {
  address: string;
  message: string;
  signature: string;
};

function App() {
  const [wallet, setWallet] = React.useState<WalletStrategy | undefined>();
  const network = Network.TestnetSentry;
  const networkInfo = getNetworkChainInfo(network);

  const [signature, setSignature] = React.useState<SigObject | undefined>();

  async function onLoad() {
    const _wallet = new WalletStrategy({
      chainId: networkInfo.chainId,
      wallet: Wallet.Metamask,
      ethereumOptions: {
        ethereumChainId: networkInfo.ethereumChainId!,
      },
    });
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

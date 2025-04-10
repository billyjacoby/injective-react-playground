import { BaseWalletStrategy } from '@injectivelabs/wallet-core';
import { EvmWalletStrategy } from '@injectivelabs/wallet-evm';
import React from 'react';

import { Wallet } from '@injectivelabs/wallet-base';

import { getInjectiveAddress } from '@injectivelabs/sdk-ts';
import { BigNumber } from '@injectivelabs/utils';
import './App.css';
import { NETWORK_INFO } from './constants';
import { Authorization } from './src/components/Authorization';
import { SendInj } from './src/components/SendInj';
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
    console.log('🪵 | onLoad | _wallet:', _wallet);
    const address = await _wallet.getAddresses();
    console.log('🪵 | onLoad | address:', address);
    setInjAddress(getInjectiveAddress(address?.[0]));
    setWallet(_wallet);

    const trades = await injectiveClients.indexerGrpcDerivativesApi.fetchTrades({
      marketId: '0x4ca0f92fc28be0c9761326016b5a1a2177dd6375558365116b5bdda9abc229ce',
      pagination: {
        skip: 0,
        limit: 1000
      }
    })

    console.log('🪵 | onLoad | trades:', trades);
    const relevant = trades?.trades.filter((t) => new BigNumber(t.executionPrice).lt(new BigNumber(80556000000)))
    console.log('🪵 | onLoad | relevant:', relevant.map((r) => ({...r, iso: new Date(r.executedAt).toISOString()})));


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
        <SendInj wallet={wallet} address={injAddress} />
      </div>
    </div>
  );
}

export default App;

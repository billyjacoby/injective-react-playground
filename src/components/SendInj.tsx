import { BaseWalletStrategy } from '@injectivelabs/wallet-core';
import React from 'react';
import { chainGrpcBankApi } from '../../constants';

export const SendInj = ({
  wallet,
  address,
}: {
  wallet?: BaseWalletStrategy;
  address?: string;
}) => {
    const [injToSend, setInjToSend] = React.useState<number>(0.001);
    const [injBalance, setInjBalance] = React.useState<number>(0);

    async function sendInj() {
        alert('not implemented');
    }

    async function getInjBalance() {
        console.log('🪵 | getInjBalance | address:', address);
        if (!address) return;
        console.log('FETCHING BALANCES')
        const balances = await chainGrpcBankApi.fetchBalances(address)
        const inj = balances.balances.find((b) => b.denom === 'inj');
        if (inj) {
          setInjBalance(Number(inj.amount) / 1e18);
        }
        console.log('🪵 | getInjBalance | balances:', balances);
    }

    React.useEffect(() => {
        getInjBalance();
    }, [address]);

  return <div>
    <input type="number" value={injToSend} onChange={(e) => setInjToSend(Number(e.target.value))} />
      <button onClick={sendInj}>send inj</button>;
      <p>Inj Balance: {injBalance}</p>
    </div>
};

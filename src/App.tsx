import React from 'react';
import './App.css';

import { MsgBroadcaster, WalletStrategy } from '@injectivelabs/wallet-ts';
import { ChainId, MsgType } from '@injectivelabs/ts-types';
import { Network } from '@injectivelabs/networks';
import { MsgGrant, getInjectiveAddress } from '@injectivelabs/sdk-ts';

const messageTypes = Object.entries(MsgType).map(([name, value]) => ({
  name,
  value,
  isChecked: false,
}));

function App() {
  const [msgBroadcaster, setMsgBroadcaster] =
    React.useState<MsgBroadcaster | null>(null);

  const [walletStrategy, setWalletStrategy] =
    React.useState<WalletStrategy | null>(null);

  const [publicKeyHex, setPublicKeyHex] = React.useState<string | null>(null);
  const [granteeInjAddress, setGranteeInjAddress] = React.useState<string>('');

  const [selectedMsgTypes, setSelectedMsgTypes] = React.useState(messageTypes);

  React.useEffect(() => {
    (async () => {
      const newWalletStrategy = new WalletStrategy({
        chainId: ChainId.Testnet,
        ethereumOptions: {
          ethereumChainId: 5,
        },
      });

      setWalletStrategy(newWalletStrategy);

      const addresses = await newWalletStrategy.getAddresses();
      if (addresses.length > 0) {
        setPublicKeyHex(addresses[0]);
      }

      const newMsgBroadcaster = new MsgBroadcaster({
        walletStrategy: newWalletStrategy,
        feePayerPubKey: addresses[0],
        network: Network.Testnet,
      });

      setMsgBroadcaster(newMsgBroadcaster);

      const queryString = window.location.search;
      console.log(queryString);
    })();
  }, []);

  function handleCheckboxChange(value: string, isChecked: boolean) {
    console.log(value);
    setSelectedMsgTypes((prev) =>
      prev.map((msgType) => {
        if (msgType.value === value) {
          return {
            ...msgType,
            isChecked: !isChecked,
          };
        }
        return msgType;
      })
    );
  }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!publicKeyHex) return;
    if (!granteeInjAddress) return;
    if (!msgBroadcaster) return;

    const msgs = selectedMsgTypes
      .filter(({ isChecked }) => isChecked)
      .map(({ value }) =>
        MsgGrant.fromJSON({
          grantee: granteeInjAddress,
          granter: getInjectiveAddress(publicKeyHex),
          messageType: '/' + value,
        })
      );

    console.log('🪵 | handleFormSubmit | msgs:', msgs);

    const result = await msgBroadcaster.broadcast({
      msgs,
      address: publicKeyHex,
      injectiveAddress: getInjectiveAddress(publicKeyHex),
      ethereumAddress: publicKeyHex,
    });
    console.log('🪵 | handleFormSubmit | result:', result);
  }

  return (
    <>
      <div>
        <h1 className="text-5xl font-bold">AuthZ React</h1>
        {publicKeyHex && (
          <>
            <p>Wallet Connected! {publicKeyHex}</p>

            <form className="flex flex-col" onSubmit={handleFormSubmit}>
              <>
                <label>Grantee Inj Address</label>
                <input
                  type="text"
                  placeholder="Grantee Inj Address"
                  value={granteeInjAddress}
                  onChange={(e) => {
                    const address = e.target.value;

                    if (address) {
                      setGranteeInjAddress(address);
                    } else {
                      setGranteeInjAddress('');
                    }
                  }}
                />
              </>
              <button type="submit" className="bg-slate-500 my-2">
                Grant Permissions
              </button>
              {selectedMsgTypes.map(({ name, value, isChecked }) => (
                <div>
                  <label>{name}</label>
                  <input
                    type="checkbox"
                    value={value}
                    checked={isChecked}
                    onChange={() => handleCheckboxChange(value, isChecked)}
                  />
                </div>
              ))}
            </form>
          </>
        )}
      </div>
    </>
  );
}

export default App;

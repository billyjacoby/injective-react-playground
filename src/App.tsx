import React from 'react';
import './App.css';

import { MsgBroadcaster, WalletStrategy } from '@injectivelabs/wallet-ts';
import { ChainId, MsgType } from '@injectivelabs/ts-types';
import { Network } from '@injectivelabs/networks';
import { MsgGrant, getInjectiveAddress } from '@injectivelabs/sdk-ts';

import Select, { MultiValue, defaultTheme } from 'react-select';

const messageTypes = Object.entries(MsgType).map(([name, value]) => ({
  name,
  value,
  isChecked: false,
}));

function App() {
  const [msgBroadcaster, setMsgBroadcaster] =
    React.useState<MsgBroadcaster | null>(null);

  const [publicKeyHex, setPublicKeyHex] = React.useState<string | null>(null);
  const [granteeInjAddress, setGranteeInjAddress] = React.useState<string>('');
  const [allMessagesSelected, setAllMessagesSelected] = React.useState(false);

  const [selectedMsgTypes, setSelectedMsgTypes] = React.useState(messageTypes);

  React.useEffect(() => {
    onInitialLoad();
  }, []);

  async function onInitialLoad() {
    parseParams();

    const walletStrategy = new WalletStrategy({
      chainId: ChainId.Testnet,
      ethereumOptions: {
        ethereumChainId: 5,
      },
    });

    const addresses = await walletStrategy.getAddresses();
    if (addresses.length > 0) {
      setPublicKeyHex(addresses[0]);
    }

    const newMsgBroadcaster = new MsgBroadcaster({
      walletStrategy: walletStrategy,
      feePayerPubKey: addresses[0],
      network: Network.Testnet,
    });

    setMsgBroadcaster(newMsgBroadcaster);
  }

  function parseParams() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);

    const granteeInjAddress = urlParams.get('granteeInjAddress');

    if (granteeInjAddress) setGranteeInjAddress(granteeInjAddress);

    const allMessagesSelected = urlParams.get('allMessagesSelected');

    if (allMessagesSelected) {
      setAllMessagesSelected(true);
      return;
    }

    const encodedMsgValues = urlParams.get('msgValues');
    const msgValuesFromParams = atob(encodedMsgValues || '').split(',');

    if (msgValuesFromParams.length) {
      setSelectedMsgTypes((prev) => {
        return prev.map((msgType) => {
          if (msgValuesFromParams.includes(msgType.value)) {
            return {
              ...msgType,
              isChecked: true,
            };
          }
          return msgType;
        });
      });
    }
  }

  const handleSelectChange = (
    multiValue: MultiValue<{ label: string; value: MsgType }>
  ) => {
    const selectedMsgTypes = multiValue.map(({ value }) => value);
    setSelectedMsgTypes((prev) =>
      prev.map((msgType) => ({
        ...msgType,
        isChecked: selectedMsgTypes.includes(msgType.value),
      }))
    );
  };

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const messageStrings = selectedMsgTypes
      .filter(({ isChecked }) => isChecked)
      .map(({ value }) => value)
      .join(',');

    console.log(btoa(messageStrings));

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

            <form
              className="flex flex-col gap-3 text-left"
              onSubmit={handleFormSubmit}
            >
              <div className="flex flex-col">
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
              </div>
              <div className="flex gap-2">
                <label>Grant Full Permissions</label>
                <input
                  type="checkbox"
                  checked={allMessagesSelected}
                  onChange={(e) => {
                    setAllMessagesSelected(e.target.checked);
                  }}
                />
              </div>

              <Select
                isDisabled={allMessagesSelected}
                className="text-left"
                styles={{
                  option(base, props) {
                    return {
                      ...base,
                      backgroundColor: props.isFocused
                        ? defaultTheme.colors.primary
                        : 'white',
                      color: props.isFocused ? 'white' : 'black',
                    };
                  },
                }}
                isOptionSelected={(option) =>
                  selectedMsgTypes.find(({ value }) => value === option.value)
                    ?.isChecked ?? false
                }
                onChange={handleSelectChange}
                value={selectedMsgTypes
                  .filter(({ isChecked }) => isChecked)
                  .map(({ name, value }) => ({ label: name, value }))}
                isMulti
                options={selectedMsgTypes.map(({ name, value }) => ({
                  label: name,
                  value,
                }))}
              />

              <button type="submit" className="bg-slate-500 my-2">
                Grant Permissions
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
}

export default App;

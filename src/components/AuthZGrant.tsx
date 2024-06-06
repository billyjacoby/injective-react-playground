import { Network } from '@injectivelabs/networks';
import { MsgGrant, getInjectiveAddress } from '@injectivelabs/sdk-ts';
import { ChainId, MsgType } from '@injectivelabs/ts-types';
import { MsgBroadcaster, WalletStrategy } from '@injectivelabs/wallet-ts';
import React from 'react';

const messageTypes = Object.entries(MsgType).map(([name, value]) => ({
  name,
  value,
  isChecked: false,
}));

export const AuthZGrant: React.FC<{ granteeInjAddress: string | null }> = ({
  granteeInjAddress,
}) => {
  const [msgBroadcaster, setMsgBroadcaster] =
    React.useState<MsgBroadcaster | null>(null);

  const [publicKeyHex, setPublicKeyHex] = React.useState<string | null>(null);
  const [allMessagesSelected, setAllMessagesSelected] = React.useState(true);

  const selectedMsgTypes = messageTypes;

  React.useEffect(() => {
    onInitialLoad();
  }, []);

  async function onInitialLoad() {
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

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const messageStrings = selectedMsgTypes
      .map(({ value }) => value)

      .join(',');

    console.log(btoa(messageStrings));

    if (!publicKeyHex) return;
    if (!granteeInjAddress) return;
    if (!msgBroadcaster) return;

    const msgs = selectedMsgTypes.map(({ value }) =>
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
                  disabled
                  placeholder="Grantee Inj Address"
                  value={granteeInjAddress ?? 'NO ADDRESS'}
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

              <button type="submit" className="bg-slate-500 my-2">
                Grant Permissions
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
};

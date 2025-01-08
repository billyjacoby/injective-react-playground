import {
  getNetworkChainInfo,
  getNetworkEndpoints,
  Network,
} from "@injectivelabs/networks";
import {
  getInjectiveAddress,
  getSubaccountId,
  MsgBroadcasterWithPk,
  MsgCreateSpotMarketOrder,
  OrderTypeMap
} from "@injectivelabs/sdk-ts";
import { MsgBroadcaster, Wallet, WalletStrategy } from "@injectivelabs/wallet-ts";
import React from "react";
import "./App.css";

export type SigObject = {
  address: string;
  message: string;
  signature: string;
};

const network = Network.Mainnet;
const networkInfo = getNetworkChainInfo(network);
const endpoints = getNetworkEndpoints(network);

if (!import.meta.env.VITE_PRIVATE_KEY) {
  throw new Error("VITE_PRIVATE_KEY is not set");
}

if (!import.meta.env.VITE_ETH_ADDRESS) {
  throw new Error("VITE_ETH_ADDRESS is not set");
}

const privateKey = import.meta.env.VITE_PRIVATE_KEY;
const ethAddress = import.meta.env.VITE_ETH_ADDRESS;
const address = getInjectiveAddress(ethAddress);

const msg = MsgCreateSpotMarketOrder.fromJSON({
  marketId:
    "0xa508cb32923323679f29a032c70342c147c17d0145625922b0ef22e955c844c0",
  feeRecipient: address,
  injectiveAddress: address,
  orderType: OrderTypeMap.SELL,
  quantity: "50000000000000000.000000000000000000",
  price: "0.000000000020880000",
  subaccountId: getSubaccountId(address),
});

function App() {
  const [wallet, setWallet] = React.useState<WalletStrategy | undefined>();

  async function onLoad() {
    const _wallet = new WalletStrategy({
      chainId: networkInfo.chainId,
      wallet: Wallet.PrivateKey,
      ethereumOptions: {
        ethereumChainId: networkInfo.ethereumChainId!,
      },
      options: {
        privateKey
      }
    });
    setWallet(_wallet);
  }

  React.useEffect(() => {
    onLoad();
  }, []);

  async function sendWithMsgBroadcasterWithPK() {
    console.log('SENDING WITH MSG BROADCASTER WITH PK');
    const msgBroadcasterPrivateKey = new MsgBroadcasterWithPk({
      privateKey,
      network,
      endpoints,
      simulateTx: true,
      chainId: networkInfo.chainId,
      ethereumChainId: networkInfo.ethereumChainId!,
    });

    const tx = await msgBroadcasterPrivateKey.broadcastWithFeeDelegation({
      msgs: [msg],
    });

    console.log("🪵 | sendWithPrivateKey | tx:", tx);
  }

  async function sendWithMsgBroadcaster() {
    if (!wallet) {
      return console.error("No wallet found");
    }

    console.log('SENDING WITH MSG BROADCASTER WITH PK');

    const msgBroadcaster = new MsgBroadcaster({
      walletStrategy: wallet,
      network: network,
      endpoints: endpoints,
      simulateTx: true,
    });
    console.log("🪵 | sellInj | address:", address);

    const tx = await msgBroadcaster.broadcastWithFeeDelegation({
      msgs: [msg],
      address,
    });

    console.log("🪵 | sellInj | tx:", tx);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-5xl ">Injective React</h1>
      <div className="flex flex-col gap-2">
        <button onClick={sendWithMsgBroadcasterWithPK}>Send w/ MsgBroadcasterWithPK</button>
        <button onClick={sendWithMsgBroadcaster}>Send w/ MsgBroadcaster</button>
      </div>
    </div>
  );
}

export default App;

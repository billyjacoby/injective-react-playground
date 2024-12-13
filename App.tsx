import {
  getNetworkChainInfo,
  getNetworkEndpoints,
  Network,
} from "@injectivelabs/networks";
import { MsgSend } from "@injectivelabs/sdk-ts";
import {
  MsgBroadcaster,
  Wallet,
  WalletStrategy,
} from "@injectivelabs/wallet-ts";
import React from "react";
import "./App.css";
import { Authorization } from "./src/components/Authorization";
import { Positions } from "./src/components/Positions";

export type SigObject = {
  address: string;
  message: string;
  signature: string;
};

if (!import.meta.env.VITE_MAGIC_API_KEY) {
  throw new Error("MAGIC_API_KEY is not set");
}

function App() {
  const [wallet, setWallet] = React.useState<WalletStrategy | undefined>();
  const [broadcaster, setBroadcaster] = React.useState<
    MsgBroadcaster | undefined
  >();
  const [address, setAddress] = React.useState<string | undefined>();
  console.log("🪵 | address:", address);
  const network = Network.Testnet;
  const networkInfo = getNetworkChainInfo(network);
  const endpoints = getNetworkEndpoints(network);

  const [signature, setSignature] = React.useState<SigObject | undefined>();
  // "AwtqlPVSzUnClEOzt2cgYJiNWZoUzNfGcyDmId8UCa1s"
  // 0x9759e2c8f33f8b7424d1bb7551710e1f7408afb2

  async function onLoad() {
    const _wallet = new WalletStrategy({
      chainId: networkInfo.chainId,
      wallet: Wallet.Magic,
      ethereumOptions: {
        ethereumChainId: networkInfo.ethereumChainId!,
      },
      options: {
        metadata: {
          magic: {
            apiKey: import.meta.env.VITE_MAGIC_API_KEY!,
            rpcEndpoint: endpoints.rpc!,
          },
        },
      },
    });
    setWallet(_wallet);
    setBroadcaster(
      new MsgBroadcaster({
        chainId: networkInfo.chainId,
        network,
        walletStrategy: _wallet,
      })
    );
  }

  React.useEffect(() => {
    onLoad();
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-5xl ">Injective React</h1>
      <div className="flex flex-col gap-2">
        <button
          onClick={async () => {
            const connectResult = await wallet?.enableAndGetAddresses({
              email: "billy+1@injectivelabs.org",
              provider: "email",
            });
            console.log("🪵 | onClick={ | connectResult:", connectResult);
            setAddress(connectResult?.[0]);
          }}
        >
          Connect
        </button>
        <button
          onClick={() => {
            wallet?.disconnect();
          }}
        >
          logout
        </button>
        {signature && <p>Signature saved!</p>}
        {!signature && <p className="text-red-500">Signature required!</p>}
        <Authorization
          wallet={wallet}
          setSignature={setSignature}
          ethereumChainId={networkInfo.ethereumChainId!}
          address={address}
          grpcEndpoint={endpoints.grpc!}
        />
        <Positions signature={signature} />
        {broadcaster && address && (
          <button
            onClick={async () => {
              const result = await broadcaster.broadcastV2({
                msgs: MsgSend.fromJSON({
                  amount: {
                    denom: "inj",
                    amount: "1",
                  },
                  srcInjectiveAddress: address,
                  dstInjectiveAddress:
                    "inj158lgtwt4n9u053j3p6r4ew2mzzky2uvy5vzyfg",
                }),
                address,
              });
              console.log("🪵 | onClick={ | result:", result);
            }}
          >
            broadcast
          </button>
        )}
      </div>
    </div>
  );
}

export default App;

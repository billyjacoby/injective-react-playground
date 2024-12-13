import { getEthereumAddress } from "@injectivelabs/sdk-ts";
import { WalletStrategy } from "@injectivelabs/wallet-ts";
import React from "react";
import { SigObject } from "../../App";
import { client, getAccountDetails } from "../../utils";
import { getEip712TypedData } from "../utils/getEip712TypedData";

export const Authorization = ({
  wallet,
  setSignature,
  ethereumChainId,
  address,
  grpcEndpoint,
}: {
  wallet?: WalletStrategy;
  ethereumChainId: number;
  setSignature: (sig: SigObject) => void;
  address: string | undefined;
  grpcEndpoint: string;
}) => {
  async function authorize() {
    console.log("AUTHING");
    console.log("🪵 | authorize | address:", address);
    if (!address) {
      console.error("No addresses connected");
      return;
    }
    const accountDetails = await getAccountDetails(address, grpcEndpoint);
    const ethAddress = getEthereumAddress(address);
    console.log("🪵 | authorize | ethAddress:", ethAddress);
    console.log("🪵 | authorize | accountDetails:", accountDetails);
    const injAddress = address;
    console.log("🪵 | retrieveNonce | injAddress:", injAddress);
    const message = `In order to enable notifications for you address you must adhere to the terms of service.
    
Click to sign in and accept the Helix Mobile Terms of Service and Privacy Policy.

This request will not trigger a blockchain transaction or cost any gas fees.

Wallet Address:
${injAddress}

Nonce:
${crypto.randomUUID()}
`;

    const magicMessage = JSON.stringify(
      getEip712TypedData(injAddress, message, ethereumChainId)
    );
    console.log("🪵 | authorize | magicMessage:", magicMessage);

    const signature = await wallet?.signEip712TypedData(magicMessage, address);
    console.log("🪵 | retrieveNonce | signedBytes:", signature);

    if (!signature) {
      return console.error("No signature found");
    }

    const result = await client.api.debug["check-auth"]
      .$post({
        json: {
          address: injAddress,
          message: message,
          eip712: magicMessage,
          signature,
          pubKey: "",
        },
      })
      .then((r) => r.json());

    console.log("🪵 | authorize | result:", result);
  }

  return (
    <button onClick={authorize} disabled={!address}>
      authenticate
    </button>
  );
};

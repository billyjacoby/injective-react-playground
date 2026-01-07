/**
 * A flattened script showcasing everything needed to complete a swap between Polygon and Arbitrum.
 * 
 * The script covers several steps needed to complete a swap between Polygon and Arbitrum, 
 * along with the demonstration of how to call the approve on ERC-20 tokens.
 */

import {
  BaseWalletStrategy,
  MsgBroadcaster
} from "@injectivelabs/wallet-core";

import { InterfaceAbi } from "ethers";

import {
  MsgEthereumTx,
  getEthereumAddress
} from "@injectivelabs/sdk-ts";
import { BigNumberInBase } from "@injectivelabs/utils";
import { ChainId } from "@injectivelabs/ts-types";

export const DEBRIDGE_API = "https://dln.debridge.finance/v1.0";

const POLYGON_CHAIN_ID = 137
const INJECTIVE_CHAIN_ID = 1776

const POLYGON_WALLET_ADDRESS = "0xbF5b4821455e33e12149ADD3390462c7f1bfc495"

const INJECTIVE_USDT_ADDRESS = "0x88f7F2b685F9692caf8c478f5BADF09eE9B1Cc13"
const POLYGON_USDC_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"

// ERC-20 ABI Helpers
const ERC20_APPROVE_SELECTOR = "0x095ea7b3";
const ERC20_ALLOWANCE_SELECTOR = "0xdd62ed3e";

function encodeApproveData(spender: string, amount: string): string {
  // spender is address (padded to 32 bytes), amount is uint256 (padded to 32 bytes)
  const paddedSpender = spender.replace("0x", "").padStart(64, "0");
  const hexAmount = BigInt(amount).toString(16).padStart(64, "0");
  return `${ERC20_APPROVE_SELECTOR}${paddedSpender}${hexAmount}`;
}

function encodeAllowanceData(owner: string, spender: string): string {
  const paddedOwner = owner.replace("0x", "").padStart(64, "0");
  const paddedSpender = spender.replace("0x", "").padStart(64, "0");
  return `${ERC20_ALLOWANCE_SELECTOR}${paddedOwner}${paddedSpender}`;
}

// Input parameters for creating a deBridge order
export interface deBridgeOrderInput {
  srcChainId: string;
  srcChainTokenIn: string;
  srcChainTokenInAmount: string;
  dstChainId: string;
  dstChainTokenOut: string;
  dstChainTokenOutRecipient?: string;
  account?: string;
  dstChainTokenOutAmount?: string;
  slippage?: number;
  additionalTakerRewardBps?: number;
  srcIntermediaryTokenAddress?: string;
  dstIntermediaryTokenAddress?: string;
  dstIntermediaryTokenSpenderAddress?: string;
  intermediaryTokenUSDPrice?: number;
  srcAllowedCancelBeneficiary?: string;
  referralCode?: number;
  affiliateFeePercent?: number;
  srcChainOrderAuthorityAddress?: string;
  srcChainRefundAddress?: string;
  dstChainOrderAuthorityAddress?: string;
  prependOperatingExpenses?: boolean;
  deBridgeApp?: string;
}

// Response structure for a deBridge order
export interface deBridgeOrderResponse {
  tx: {
    data: string;
    to: string;
    value: string;
  };
  estimation: {
    srcChainTokenIn: {
      amount: string;
      tokenAddress: string;
      decimals: number;
      symbol: string;
    };
    dstChainTokenOut: {
      amount: string;
      tokenAddress: string;
      decimals: number;
      symbol: string;
    };
    fees: {
      srcChainTokenIn: string;
      dstChainTokenOut: string;
    };
  };
}

async function checkAllowance(
  tokenAddress: string,
  owner: string,
  spender: string
): Promise<bigint> {
  // Injective Mainnet EVM RPC
  const evmRpcUrl = "https://k8s.mainnet.evm.grpc-web.injective.network"; 
  
  const data = encodeAllowanceData(owner, spender);
  
  const body = {
    jsonrpc: "2.0",
    method: "eth_call",
    params: [
      {
        to: tokenAddress,
        data: data
      },
      "latest"
    ],
    id: 1
  };

  try {
    const response = await fetch(evmRpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    
    const result = await response.json();
    if (result.error) {
       console.warn("Error checking allowance:", result.error);
       return BigInt(0);
    }
    return BigInt(result.result);
  } catch(e) {
    console.warn("Failed to check allowance via RPC", e);
    return BigInt(0);
  }
}

/**
 * Create a deBridge cross-chain transfer order.
 *
 * @param params - Bridge order parameters.
 * @returns The order response including transaction data.
 * @throws If source and destination chains are the same or API call fails.
 */
export async function createDebridgeBridgeOrder(
  params: deBridgeOrderInput
): Promise<deBridgeOrderResponse> {
  if (params.srcChainId === params.dstChainId) {
    throw new Error("Source and destination chains must differ.");
  }

  // Build query string parameters
  const queryParams = new URLSearchParams({
    srcChainId: params.srcChainId,
    srcChainTokenIn: params.srcChainTokenIn,
    srcChainTokenInAmount: params.srcChainTokenInAmount,
    dstChainId: params.dstChainId,
    dstChainTokenOut: params.dstChainTokenOut,
    dstChainTokenOutRecipient: params.dstChainTokenOutRecipient || "",
    dstChainTokenOutAmount: params.dstChainTokenOutAmount || "auto",
    senderAddress: params.account || "",
    srcChainOrderAuthorityAddress:
      params.srcChainOrderAuthorityAddress || params.account || "",
    srcChainRefundAddress: params.account || "",
    dstChainOrderAuthorityAddress:
      params.dstChainOrderAuthorityAddress || params.dstChainTokenOutRecipient || "",
    referralCode: "31805",
    prependOperatingExpenses: "true"
  });

  const response = await fetch(
    `${DEBRIDGE_API}/dln/order/create-tx?${queryParams}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create order: ${response.statusText}. ${errorText}`
    );
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`deBridge API error: ${data.error}`);
  }

  // Ensure tx.data is a string
  if (data.tx?.data) {
    data.tx.data = data.tx.data.toString();
  }

  return data;
}

// ===== Main Execution =====
export async function executeBridgeOrder(
    walletStrategy: BaseWalletStrategy,
    injectiveAddress: string
) {
  const ethereumAddress = getEthereumAddress(injectiveAddress);
  console.log(`\nExecuting bridge order for: ${injectiveAddress} (${ethereumAddress})`);

  // Prepare token addresses, decimals, and amount
  const usdcDecimals = 6;
  const amountToSend = "0.1";

  // Convert amount to atomic units
  const amountInAtomicUnit = new BigNumberInBase(amountToSend).toWei(usdcDecimals);

  // Construct order parameters
  const orderInput: deBridgeOrderInput = {
    srcChainId: INJECTIVE_CHAIN_ID.toString(),
    srcChainTokenIn: INJECTIVE_USDT_ADDRESS,
    srcChainTokenInAmount: amountInAtomicUnit.toFixed(),
    dstChainId: POLYGON_CHAIN_ID.toString(),
    dstChainTokenOut: POLYGON_USDC_ADDRESS,
    dstChainTokenOutRecipient: POLYGON_WALLET_ADDRESS,
    account: ethereumAddress,
    srcChainOrderAuthorityAddress: ethereumAddress,
    dstChainOrderAuthorityAddress: POLYGON_WALLET_ADDRESS
  };

  console.log(
    "\nCreating deBridge order with input:",
    JSON.stringify(orderInput, null, 2)
  );
  const order = await createDebridgeBridgeOrder(orderInput);

  if (!order?.tx?.to || !order.tx.data) {
    throw new Error("Invalid transaction data returned from order creation.");
  }

  console.log("\nOrder estimation:", order.estimation);

  // ===== Token Approval =====
  const spenderAddress = order.tx.to;
  
  console.log("\nChecking or setting token approval...");
  console.log(
    ` Token: ${orderInput.srcChainTokenIn} | Spender: ${spenderAddress}`
  );
  console.log(
    ` Required amount: ${amountToSend} USDC`
  );

  const requiredAmount = BigInt(order.estimation.srcChainTokenIn.amount);

  try {
    console.log("Checking current allowance...");
    const currentAllowance: bigint = await checkAllowance(
        orderInput.srcChainTokenIn,
        ethereumAddress,
        spenderAddress
    );
    
    console.log(
      ` Current allowance: ${new BigNumberInBase(currentAllowance.toString()).toWei(-usdcDecimals).toFixed()} USDC`
    );

    if (currentAllowance < requiredAmount) {
      console.log("Allowance insufficient—sending approval...");
      
      const approveData = encodeApproveData(spenderAddress, requiredAmount.toString());
      
      const approveMsg = MsgEthereumTx.fromJSON({
        injectiveAddress: injectiveAddress,
        address: ethereumAddress,
        action: 'approve', // Label for UI/logging if supported
        data: {
          to: orderInput.srcChainTokenIn,
          data: approveData, 
          // Gas limit/price might be estimated by the wallet/SDK
        }
      });

      console.log("Submitting approval transaction...");
      const txHash = await walletStrategy.sendTransaction(approveMsg, {
          chainId: ChainId.Mainnet,
          address: injectiveAddress,
          endpoints: {
            grpc: "sentry.chain.grpc.injective.network:443",
            rest: "https://sentry.tm.injective.network:443",
          }
      });
      
      console.log(`Approval tx hash: ${txHash}`);
      console.log("Approval successful! (Optimistically assuming success) ✅");
    } else {
      console.log("Sufficient allowance already granted. 👍");
    }
  } catch (err) {
    console.error("\nError during approval:",
      err instanceof Error ? err.message : err
    );
    throw new Error("Token approval failed—cannot proceed.");
  }

  // ===== Main Bridge Transaction =====
  try {
    console.log("\nSubmitting bridge transaction...");
    
    const bridgeMsg = MsgEthereumTx.fromJSON({
        injectiveAddress: injectiveAddress,
        address: ethereumAddress,
        action: 'bridge',
        data: {
            to: order.tx.to,
            data: order.tx.data,
            value: order.tx.value
        }
    });

    const txHash = await walletStrategy.sendTransaction(bridgeMsg, {
          chainId: ChainId.Mainnet,
          address: injectiveAddress,
          endpoints: {
            grpc: "sentry.chain.grpc.injective.network:443",
            rest: "https://sentry.tm.injective.network:443",
          }
      });
      

    console.log(`Bridge tx hash: ${txHash}`);
    console.log(`Explorer: https://explorer.injective.network/transaction/${txHash}`); // Assuming generic explorer link

  } catch (err) {
    console.error("\nError sending bridge transaction:",
      err instanceof Error ? err.message : err
    );
    throw err;
  }

  console.log("\nOrder execution initiated.");
}
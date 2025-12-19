# Technical Design: Onramp & Bridge Re-architecture

This document outlines the purely functional re-architecture of the Injective Onramp and Bridge flow. We move away from class-based services towards a stateless, functional approach that prioritizes clarity, testability, and separation of concerns.

## Core Principles

- **Functional over OOP**: Use pure functions that take their dependencies (clients, addresses, etc.) as arguments.
- **Statelessness**: Avoid internal state in services. All state should be managed by the UI or dedicated state managers (e.g., Zustand).
- **Separation of Concerns**: Split logic into "Getters" (read-only data fetching) and "Transaction Preparers" (logic to generate transaction data).
- **Type Safety**: Use TypeScript for all inputs and outputs.

---

## 1. Getter Functions (Read-only)

These functions fetch data from external APIs or the blockchain. They do not modify state.

### `fetchBalances`

Gets the ETH and WETH balances for a given Ethereum address.

```typescript
type Balances = {
  eth: bigint;
  weth: bigint;
}

/**
 * Fetches ETH and WETH balances for a given address
 */
async function fetchBalances(
  address: string, 
  publicClient: PublicClient,
  wethAddress: string
): Promise<Balances>
```

### `estimateGasCosts`

Calculates the estimated gas costs for the entire flow (Wrap + Approve + Bridge).

```typescript
type GasEstimation = {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  totalGasLimit: bigint;
  estimatedCostEth: string;
}

/**
 * Estimates gas for all steps based on current network conditions
 */
async function estimateGasCosts(
  publicClient: PublicClient,
  speed: 'slow' | 'normal' | 'fast'
): Promise<GasEstimation>
```

### `fetchMarketPrice`

Gets the current WETH/USDT price from the Injective Spot Market.

```typescript
/**
 * Fetches mid-price from Injective orderbook
 */
async function fetchWethUsdtPrice(
  indexerSpotApi: IndexerGrpcSpotApi,
  marketId: string
): Promise<number>
```

### `calculateFees`

Calculates MoonPay and bridge fees.

```typescript
/**
 * Calculates MoonPay fee based on input USD amount
 */
function calculateMoonPayFee(usdAmount: number): number {
  const MOONPAY_BASE_PERCENT = 0.045; // 4.5%
  return usdAmount * MOONPAY_BASE_PERCENT;
}
```

---

## 2. Contract Functions (Mutative)

These functions prepare transaction data. They do not "send" transactions but return the necessary data for a wallet to execute.

### `prepareWrapEthTx`

Prepares the calldata and transaction object for depositing ETH into the WETH contract.

```typescript
/**
 * Generates transaction to wrap ETH
 */
async function prepareWrapEthTx(
  amount: bigint,
  fromAddress: string,
  wethAddress: string,
  publicClient: PublicClient
): Promise<EthereumTransaction>
```

### `prepareAllowanceTx`

Handles WETH allowance for the Peggy bridge. Logic includes checking existing allowance and preparing either a single `approve` or a `reset + approve` sequence.

```typescript
/**
 * Generates transaction(s) to set allowance for Peggy contract.
 * Note: Some ERC20 tokens require resetting allowance to 0 before setting a new value.
 */
async function prepareAllowanceTx(
  owner: string,
  spender: string,
  tokenAddress: string,
  amount: bigint = maxUint256,
  publicClient: PublicClient
): Promise<EthereumTransaction[]>
```

### `prepareBridgeTx`

Prepares the `sendToInjective` call on the Peggy contract.

```typescript
/**
 * Generates transaction to bridge funds via Peggy
 */
async function prepareBridgeTx(
  params: {
    amount: bigint,
    tokenAddress: string,
    injectiveAddress: string,
    ethereumAddress: string,
    peggyAddress: string
  },
  publicClient: PublicClient
): Promise<EthereumTransaction>
```

---

## 3. Implementation Pseudo-code

### Fetching Balances

```typescript
async function fetchBalances(address, client, wethAddr) {
  const [ethBalance, wethBalance] = await Promise.all([
    client.getBalance({ address }),
    client.readContract({
      address: wethAddr,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address]
    })
  ]);
  return { eth: ethBalance, weth: wethBalance };
}
```

### Preparing Allowance (Reset Logic)

```typescript
async function prepareAllowanceTx(owner, spender, tokenAddr, amount, client) {
  const currentAllowance = await client.readContract({
    address: tokenAddr,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [owner, spender]
  });

  const txs = [];

  // If allowance is not 0 and we want to set a new allowance, 
  // some tokens require resetting to 0 first
  if (currentAllowance > 0n && currentAllowance < amount) {
    txs.push(await createApproveTx(owner, spender, tokenAddr, 0n, client));
  }

  txs.push(await createApproveTx(owner, spender, tokenAddr, amount, client));
  
  return txs;
}
```

### Preparing the Bridge

```typescript
async function prepareBridgeTx({ amount, tokenAddress, injectiveAddress, ethereumAddress, peggyAddress }, client) {
  // 1. Convert Injective Bech32 to Bytes32
  const destination = convertBech32ToBytes32(injectiveAddress);
  
  // 2. Encode Peggy's sendToInjective
  const data = encodeFunctionData({
    abi: PEGGY_ABI,
    functionName: 'sendToInjective',
    args: [tokenAddress, destination, amount, ""]
  });

  // 3. Estimate Gas & Nonce
  const { gas, fees, nonce } = await estimateGasAndNonce({
    from: ethereumAddress,
    to: peggyAddress,
    data,
    publicClient: client
  });

  return {
    to: peggyAddress,
    from: ethereumAddress,
    data,
    gas,
    ...fees,
    nonce
  };
}
```

## 4. Proposed File Structure

```text
src/
  onramp/
    getters/
      balances.ts
      gas.ts
      prices.ts
      fees.ts
    contract/
      weth.ts
      peggy.ts
      allowance.ts
    utils/
      address-conversion.ts
      gas-estimation.ts
    types.ts
```

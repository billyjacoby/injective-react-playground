// pulled from: https://github.com/debridge-finance/api-integrator-example/blob/master/src/constants.ts

/**
 * ERC-20 ABI compatible with viem
 * This ABI format is required for viem's readContract and writeContract functions
 */
export const debridgeERC20Abi = [
	{
		constant: true,
		inputs: [{ name: "owner", type: "address" }],
		name: "balanceOf",
		outputs: [{ name: "", type: "uint256" }],
		type: "function",
		stateMutability: "view",
	},
	{
		constant: true,
		inputs: [],
		name: "decimals",
		outputs: [{ name: "", type: "uint8" }],
		type: "function",
		stateMutability: "view",
	},
	{
		constant: true,
		inputs: [],
		name: "symbol",
		outputs: [{ name: "", type: "string" }],
		type: "function",
		stateMutability: "view",
	},
	{
		constant: true,
		inputs: [
			{ name: "owner", type: "address" },
			{ name: "spender", type: "address" },
		],
		name: "allowance",
		outputs: [{ name: "", type: "uint256" }],
		type: "function",
		stateMutability: "view",
	},
	{
		constant: false,
		inputs: [
			{ name: "spender", type: "address" },
			{ name: "amount", type: "uint256" },
		],
		name: "approve",
		outputs: [{ name: "", type: "bool" }],
		type: "function",
		stateMutability: "nonpayable",
	},
] as const;

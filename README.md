# Injective React Playground

A React + TypeScript + Vite application for testing Injective blockchain integrations with gasless transactions and Peggy bridge functionality.

## Environment Configuration

This project uses environment variables to configure the network and API keys. Create a `.env` file in the root directory based on `.env.example`:

```bash
# Network Configuration
# Options: "mainnet" | "testnet" | "devnet"
# Default: "testnet" (if not specified)
VITE_NETWORK=testnet

# Alchemy API Keys
VITE_ALCHEMY_KEY=your_mainnet_alchemy_key_here
VITE_ALCHEMY_SEPOLIA_KEY=your_sepolia_alchemy_key_here
```

### Network Selection

The `VITE_NETWORK` environment variable determines which Injective network the application connects to:
- `mainnet` - Injective Mainnet (Ethereum Mainnet for EVM operations)
- `testnet` - Injective Testnet (Ethereum Sepolia for EVM operations)
- `devnet` - Injective Devnet

If not specified, the application defaults to `testnet`.

## Getting Started

1. Copy `.env.example` to `.env` and fill in your API keys
2. Install dependencies: `pnpm install`
3. Start the development server: `pnpm dev`

## Features

- Gasless transactions using smart accounts
- Peggy bridge integration for cross-chain transfers
- ERC20 token operations (WETH, USDT, USDC)
- Network-aware configuration (automatically switches between mainnet/testnet endpoints)

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list

/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_PRIVATE_KEY: string
    readonly VITE_ETH_ADDRESS: string
    // more env variables...
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
import { ChainGrpcAuthApi } from '@injectivelabs/sdk-ts';
import type { AppType } from 'helix-mobile-server';
import { hc } from 'hono/client';

if (!import.meta.env.VITE_SERVER_URL) {
  throw new Error('VITE_SERVER_URL is not set');
}

export const client = hc<AppType>(import.meta.env.VITE_SERVER_URL);



export const getAccountDetails = async (address: string, grpcEndpoint: string) => {
  // const chainRestAuthApi = new ChainRestAuthApi(restEndpoint)
  const chainGrpcAuthApi = new ChainGrpcAuthApi(grpcEndpoint)
  const accountDetailsResponse = await chainGrpcAuthApi.fetchAccount(address)

  return accountDetailsResponse
}
import { getDefaultSubaccountId, getInjectiveAddress, MsgCreateDerivativeMarketOrder, OrderTypeMap } from '@injectivelabs/sdk-ts';
import { MsgBroadcaster } from '@injectivelabs/wallet-core';
import React from 'react';

export const MarketOrder = ({
  address,
  broadcaster
}: {
  broadcaster: MsgBroadcaster
  address: string;
}) => {
    console.log('🪵 | address:', address);
    const injAddress = getInjectiveAddress(address);

    async function sendMarketOrder() {
        const msg = MsgCreateDerivativeMarketOrder.fromJSON({
            marketId: '0x4ca0f92fc28be0c9761326016b5a1a2177dd6375558365116b5bdda9abc229ce',
            orderType: OrderTypeMap.BUY,
            subaccountId: getDefaultSubaccountId(injAddress),
            injectiveAddress: injAddress,
            feeRecipient: injAddress,
            quantity: '0.000100000000000000',
            price: '81374000000.000000000000000000',
            margin: '1162485.000000000000000000',
        })

        const tx = await broadcaster.broadcastWithFeeDelegation({
            msgs: [msg],
            injectiveAddress: address,
            ethereumAddress: address
        })
        console.log('🪵 | sendMarketOrder | tx:', tx);
    }



  return <div>
      <button onClick={sendMarketOrder}>market order</button>
    </div>
};

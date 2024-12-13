import {
    MsgSignData,
    generateArbitrarySignDoc,
    getEip712TypedDataV2
} from '@injectivelabs/sdk-ts'
  
  export const getEip712TypedData = (signer: string, message: string, ethereumChainId: number) => {
    const { signDoc } = generateArbitrarySignDoc(message, signer)
  
    const tx = {
      memo: signDoc.memo,
      accountNumber: signDoc.account_number,
      sequence: signDoc.sequence,
      timeoutHeight: '0',
      chainId: signDoc.chain_id
    }
  
    const msgs = signDoc.msgs.map((msg) => {
      return MsgSignData.fromJSON({
        sender: msg.value.signer,
        data: Buffer.from(msg.value.data, 'base64').toString('utf-8')
      })
    })
  
    const eip712TypedData = getEip712TypedDataV2({
      msgs,
      tx,
      ethereumChainId
    })
  
    return eip712TypedData
  }
  
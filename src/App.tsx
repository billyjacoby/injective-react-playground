import React from 'react';
import './App.css';

import QRCode from 'react-qr-code';
import { v4 as uuid } from 'uuid';
import { AuthZGrant } from './components/AuthZGrant';
import { SERVER_HOSTNAME } from '../constants';

type WsServerMessage = {
  type: 'granteeConnected';
  tokenId: string;
  granteeInjAddress: string;
};

function App() {
  const [ws, setWs] = React.useState<WebSocket | null>(null);

  const [granteeInjAddress, setGranteeInjAddress] = React.useState<
    string | null
  >(null);
  console.log('🪵 | App | granteeInjAddress:', granteeInjAddress);

  const [qrToken, setQrToken] = React.useState<{
    token: string;
    websocketUrl: string;
    postUrl: string;
  } | null>(null);

  React.useEffect(() => {
    if (!ws) {
      onInitialLoad();
    }

    return () => {
      ws?.send(JSON.stringify({ type: 'disconnect', value: qrToken }));
      ws?.close();
    };
  }, []);

  function onInitialLoad() {
    const token = uuid();

    const newWs = new WebSocket(`ws://${SERVER_HOSTNAME}:3333/ws`);
    newWs.onopen = () => {
      const websocketUrl = newWs.url;
      const postUrl = newWs.url
        .replace('ws', 'http')
        .replace('/ws', '/api/token/');
      setQrToken({ token, websocketUrl, postUrl });

      newWs.send(JSON.stringify({ type: 'token', value: token }));
      newWs.onmessage = (message) => {
        console.log('🪵 | onInitialLoad | message:', message);
        const messageObj: WsServerMessage = JSON.parse(message.data.toString());
        if (messageObj.type === 'granteeConnected') {
          setGranteeInjAddress(messageObj.granteeInjAddress);
        }
      };
      newWs.onclose = () =>
        ws?.send(JSON.stringify({ type: 'disconnect', value: qrToken }));
      console.log('🪵 | App.useEffect | ws.onopen');
    };
    setWs(newWs);
  }

  if (granteeInjAddress) {
    return <AuthZGrant granteeInjAddress={granteeInjAddress} />;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p>Scan this QR code in Helix Mobile to link your wallet!</p>
      <QRCode value={JSON.stringify(qrToken)} />
      <p>{JSON.stringify(qrToken)}</p>
    </div>
  );
}

export default App;

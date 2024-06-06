import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { WebSocketServer, WebSocket } from 'ws';

import { SERVER_HOSTNAME } from '../constants';

export let wsConnections = 0;

export const connectedClients = new Map<string, WebSocket>();

let wsClient: WebSocket | null = null;

function setWsConnections(conn: number) {
  wsConnections = conn;
}

const app = new Hono();

app.get('/', (c) => {
  return c.text('Hello Hono!');
});

app.get('/ws');

app.post('api/token/', async (c) => {
  const { granteeInjAddress, tokenId } = await c.req.json();
  console.log('🪵 | app.post | granteeInjAddress:', granteeInjAddress);
  wsClient?.send(
    JSON.stringify({ type: 'granteeConnected', tokenId, granteeInjAddress })
  );
  return c.body('Ok', 200);
});

const port = 3333;
const server = serve({
  fetch: app.fetch,
  hostname: SERVER_HOSTNAME,
  port,
});
console.log(`Server is running on port ${port}`);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wss = new WebSocketServer({ server: server as any });
wsClient = new WebSocket(`ws://${SERVER_HOSTNAME}:${port}/ws`);

type WsMessage =
  | { type: 'token'; value: string }
  | { type: 'disconnect'; value: string }
  | { type: 'granteeConnected'; tokenId: string; granteeInjAddress: string };

wss.on('connection', (ws) => {
  console.log(`➕➕ Connection (${wss.clients.size})`);
  setWsConnections(wss.clients.size);
  //? We want to send initial game state to the client as well
  ws.once('close', () => {
    console.log(`➖➖ Connection (${wss.clients.size})`);
    setWsConnections(wss.clients.size);
  });
  ws.on('message', (message) => {
    const messageObj: WsMessage = JSON.parse(message.toString());

    switch (messageObj.type) {
      case 'token':
        connectedClients.set(messageObj.value, ws);
        break;
      case 'disconnect':
        connectedClients.delete(messageObj.value);
        break;
      case 'granteeConnected':
        connectedClients.get(messageObj.tokenId)?.send(message.toString());
        break;
    }
  });
});

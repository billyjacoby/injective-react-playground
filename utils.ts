import { hc } from 'hono/client';
export const client = hc<any>('http://10.0.1.60:3000');

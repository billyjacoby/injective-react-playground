import { hc } from 'hono/client';
import type { AppType } from 'helix-mobile-server';

export const client = hc<AppType>('http://10.0.1.60:3000');

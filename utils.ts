import type { AppType } from 'helix-mobile-server';
import { hc } from 'hono/client';

export const client = hc<AppType>('http://10.0.1.60:3000');

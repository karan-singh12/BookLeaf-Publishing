import { AddressInfo } from 'net';
import type { Express } from 'express';

process.env.NODE_ENV = 'test';

/** Starts an Express app on a random port and returns a tiny fetch helper plus a stop function. */
export const startServer = async (app: Express) => {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    baseUrl,
    async request(path: string, init: RequestInit = {}) {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      });
      const text = await response.text();
      let body: any = null;
      try {
        body = JSON.parse(text);
      } catch {
        // leave null: the test asserts on it
      }
      return { status: response.status, headers: response.headers, body };
    },
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};

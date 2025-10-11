// @ts-nocheck

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  try {
    const GAS_ENDPOINT = process.env.GAS_ENDPOINT;
    if (!GAS_ENDPOINT) throw new Error('Missing GAS_ENDPOINT env');

    // body は any の可能性があるので安全に扱う
    const rawBody = (req.body ?? {}) as unknown;
    const body =
      typeof rawBody === 'string'
        ? JSON.parse(rawBody)
        : (rawBody as Record<string, unknown>);

    const r = await fetch(GAS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await r.text(); // GASはテキストJSONを返す
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(text);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ status: 'error', message: msg });
  }
}

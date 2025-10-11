// @ts-nocheck

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  try {
    const GAS_ENDPOINT = process.env.GAS_ENDPOINT;
    if (!GAS_ENDPOINT) throw new Error('Missing GAS_ENDPOINT env');

    // req.query の値は string | string[] | undefined
    const q = (v: string | string[] | undefined): string | undefined =>
      Array.isArray(v) ? v[0] : v;

    const mode = q(req.query.mode);
    const g = q(req.query.g);
    const image_id = q(req.query.image_id);
    const image = q(req.query.image);

    const url = new URL(GAS_ENDPOINT);

    if (mode === 'list') {
      if (!g) return bad(res, 'require g');
      url.searchParams.set('action', 'summaryListByGroup');
      url.searchParams.set('g', g);
    } else if (mode === 'image') {
      if (!g) return bad(res, 'require g');
      url.searchParams.set('action', 'summaryByImage');
      url.searchParams.set('g', g);
      if (image_id) {
        url.searchParams.set('image_id', image_id);
      } else if (image) {
        url.searchParams.set('img', image);
      } else {
        return bad(res, 'require image_id or image');
      }
    } else {
      return bad(res, 'unknown mode');
    }

    const r = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const text = await r.text();
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(text);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ status: 'error', message: msg });
  }
}

function bad(res: VercelResponse, msg: string) {
  return res.status(400).json({ status: 'error', message: msg });
}

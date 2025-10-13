// /api/submit.js
// GAS のステータスを素通し。POST専用。
export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ status: 'error', message: 'method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const APPSCRIPT_URL = process.env.APPSCRIPT_URL;
    if (!APPSCRIPT_URL) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'APPSCRIPT_URL missing' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload = await req.json();
    const res = await fetch(APPSCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const bodyText = await res.text();
    return new Response(bodyText || '', {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ status: 'error', message: String(err?.message || err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

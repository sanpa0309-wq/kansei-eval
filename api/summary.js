// /api/summary.js
// 405 が出ないように GET を受け付ける。GASのレスポンス/ステータスを素通し。
export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    if (req.method !== 'GET') {
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

    // クエリをそのまま GAS にプロキシ
    const { searchParams } = new URL(req.url);
    const url = new URL(APPSCRIPT_URL);
    url.searchParams.set('action', 'summary');
    for (const [k, v] of searchParams.entries()) {
      url.searchParams.set(k, v);
    }

    const res = await fetch(url.toString(), { method: 'GET' });
    const bodyText = await res.text();

    return new Response(bodyText, {
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

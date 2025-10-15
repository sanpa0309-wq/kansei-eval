// /api/group.js
// 次のグループ番号(1..5)を返すだけの超軽量API（Apps Scriptの nextGroup を叩く）
export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ status: 'error', message: 'method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const APPSCRIPT_URL = process.env.APPSCRIPT_URL;
    if (!APPSCRIPT_URL) {
      return new Response(JSON.stringify({ status: 'error', message: 'APPSCRIPT_URL missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(APPSCRIPT_URL);
    url.searchParams.set('action', 'nextGroup'); // ← Apps Script でハンドリング
    const res = await fetch(url.toString(), { method: 'GET' });
    const text = await res.text();

    return new Response(text, {
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

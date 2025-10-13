export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || '';
    const g = searchParams.get('g') || '';
    const image_id = searchParams.get('image_id') || '';
    const pid = searchParams.get('pid') || '';

    const APPSCRIPT_URL = process.env.APPSCRIPT_URL;
    if (!APPSCRIPT_URL) {
      return new Response(JSON.stringify({ status: 'error', message: 'APPSCRIPT_URL missing' }), { status: 500 });
    }

    const url = new URL(APPSCRIPT_URL);
    url.searchParams.set('action', 'summary');
    if (mode) url.searchParams.set('mode', mode);
    if (g) url.searchParams.set('g', g);
    if (image_id) url.searchParams.set('image_id', image_id);
    if (pid) url.searchParams.set('pid', pid);

    const res = await fetch(url.toString(), { method: 'GET' });
    const text = await res.text();
    return new Response(text, { status: res.ok ? 200 : 500, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ status: 'error', message: String(err?.message || err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}

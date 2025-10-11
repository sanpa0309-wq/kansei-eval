// /api/submit.ts
export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ status: "error", message: "Method Not Allowed" }), {
      status: 405, headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const GAS_ENDPOINT = process.env.GAS_ENDPOINT;
    if (!GAS_ENDPOINT) throw new Error("Missing GAS_ENDPOINT env");

    const body = await req.json();

    const res = await fetch(GAS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Apps Script 側CORSは気にしない（サーバー→サーバー）
    });

    // Apps Script は JSONテキストを返すのでそのまま返却
    const text = await res.text();
    return new Response(text, { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ status: "error", message: String(err?.message || err) }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}

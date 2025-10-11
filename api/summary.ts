// /api/summary.ts
export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ status: "error", message: "Method Not Allowed" }), {
      status: 405, headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode"); // "list" | "image"
    const g = searchParams.get("g");       // group id "1".."5"
    const image_id = searchParams.get("image_id"); // optional

    const GAS_ENDPOINT = process.env.GAS_ENDPOINT;
    if (!GAS_ENDPOINT) throw new Error("Missing GAS_ENDPOINT env");

    let url = new URL(GAS_ENDPOINT);
    if (mode === "list") {
      if (!g) return bad("require g");
      url.searchParams.set("action", "summaryListByGroup");
      url.searchParams.set("g", g);
    } else if (mode === "image") {
      if (!g || !image_id) return bad("require g & image_id");
      url.searchParams.set("action", "summaryByImage");
      url.searchParams.set("g", g);
      url.searchParams.set("image_id", image_id);
    } else {
      return bad("unknown mode");
    }

    const res = await fetch(url.toString(), { method: "GET", headers: { "Accept": "application/json" } });
    const text = await res.text();
    return new Response(text, { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ status: "error", message: String(err?.message || err) }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }

  function bad(msg: string) {
    return new Response(JSON.stringify({ status: "error", message: msg }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }
}

// @ts-nocheck
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ status: "error", message: "Method Not Allowed" });
  }

  try {
    const GAS_ENDPOINT = process.env.GAS_ENDPOINT;
    if (!GAS_ENDPOINT) throw new Error("Missing GAS_ENDPOINT env");

    // クエリ取得（Vercel は req.query が使える）
    const q = v => Array.isArray(v) ? v[0] : v;
    const mode = q(req.query.mode);
    const g    = q(req.query.g);
    const image_id = q(req.query.image_id);
    const image    = q(req.query.image);

    const url = new URL(GAS_ENDPOINT);

    if (mode === "list") {
      if (!g) return bad(res, "require g");
      url.searchParams.set("action", "summaryListByGroup");
      url.searchParams.set("g", String(g));
    } else if (mode === "image") {
      if (!g) return bad(res, "require g");
      url.searchParams.set("action", "summaryByImage");
      url.searchParams.set("g", String(g));
      if (image_id) {
        url.searchParams.set("image_id", String(image_id));
      } else if (image) {
        url.searchParams.set("img", String(image));
      } else {
        return bad(res, "require image_id or image");
      }
    } else {
      return bad(res, "unknown mode");
    }

    const r = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    const text = await r.text();
    res.setHeader("Content-Type", "application/json");
    return res.status(200).send(text);
  } catch (err) {
    return res
      .status(500)
      .json({ status: "error", message: (err && err.message) || String(err) });
  }
}

function bad(res, msg) {
  return res.status(400).json({ status: "error", message: msg });
}

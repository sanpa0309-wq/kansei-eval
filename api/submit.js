// @ts-nocheck
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ status: "error", message: "Method Not Allowed" });
  }

  try {
    const GAS_ENDPOINT = process.env.GAS_ENDPOINT;
    if (!GAS_ENDPOINT) throw new Error("Missing GAS_ENDPOINT env");

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    // そのまま GAS に中継
    const r = await fetch(GAS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const text = await r.text(); // GAS はテキストJSONを返す運用
    res.setHeader("Content-Type", "application/json");
    return res.status(200).send(text);
  } catch (err) {
    return res
      .status(500)
      .json({ status: "error", message: (err && err.message) || String(err) });
  }
}

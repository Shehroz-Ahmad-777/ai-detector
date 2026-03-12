// pages/api/hive.js
// ─── SERVER-SIDE PROXY ───────────────────────────────────────
// API key stays here on the server. Never reaches the browser.

export const config = {
  api: {
    bodyParser: false, // We handle multipart/form-data manually
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const HIVE_API_KEY = process.env.HIVE_API_KEY;
  if (!HIVE_API_KEY) {
    return res.status(500).json({ error: "Hive API key not configured. Add HIVE_API_KEY to .env.local" });
  }

  try {
    // Read raw body and forward as-is to Hive
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    // Determine if image or video from query param
    const { type } = req.query; // "image" or "video"
    const endpoint =
      type === "video"
        ? "https://api.thehive.ai/api/v2/task/sync/ai_generated_video"
        : "https://api.thehive.ai/api/v2/task/sync/ai_generated_image";

    const contentType = req.headers["content-type"] || "multipart/form-data";

    const hiveRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Token ${HIVE_API_KEY}`,
        "Content-Type": contentType,
      },
      body: rawBody,
    });

    const data = await hiveRes.json();

    if (!hiveRes.ok) {
      return res.status(hiveRes.status).json({
        error: `Hive API error: ${hiveRes.status}`,
        details: data,
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Hive proxy error:", err);
    return res.status(500).json({ error: err.message || "Proxy request failed" });
  }
}

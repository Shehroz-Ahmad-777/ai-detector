// pages/api/claude.js
// ─── SERVER-SIDE PROXY ───────────────────────────────────────
// Anthropic API key is safe here on the server.

const AI_MODELS = [
  "Midjourney", "DALL·E 3", "DALL·E 2", "Stable Diffusion XL",
  "Stable Diffusion 1.5", "Adobe Firefly", "Runway Gen-2", "Runway Gen-3",
  "Sora", "Kling", "Pika Labs", "Leonardo AI", "Ideogram", "Flux",
  "Imagen", "Playground AI", "NightCafe", "Canva AI", "Copilot Designer",
  "SeaArt", "ComfyUI / Automatic1111", "Luminar AI", "HeyGen",
  "Synthesia", "D-ID", "Luma Dream Machine", "Stable Video Diffusion",
  "AnimateDiff", "DeepAI", "StarryAI", "Artbreeder", "DreamStudio"
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "Anthropic API key not configured. Add ANTHROPIC_API_KEY to .env.local" });
  }

  try {
    const { base64, mimeType } = req.body;

    if (!base64 || !mimeType) {
      return res.status(400).json({ error: "Missing base64 or mimeType" });
    }

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mimeType, data: base64 },
              },
              {
                type: "text",
                text: `You are an expert forensic analyst specializing in detecting AI-generated images.

Analyze this image carefully for signs of AI generation. Look for:
- Unnatural texture patterns (skin, hair, fabric)
- Lighting inconsistencies or impossible shadows
- Background anomalies (blurring, merging objects)
- Anatomical errors (extra fingers, asymmetric features)
- Characteristic artifacts of specific AI models
- Over-smoothed or overly "perfect" elements
- Watermarks or style signatures of specific tools

From this list of AI tools, identify which one(s) most likely created this image:
${AI_MODELS.join(", ")}

Each model has distinctive traits:
- Midjourney: painterly quality, stylized faces, dramatic lighting, often cinematic
- DALL·E 3: clean, illustrative, consistent style, good text rendering
- Stable Diffusion: variable quality, sometimes anatomical errors, noisier textures
- Adobe Firefly: commercial-safe aesthetic, clean compositions, Adobe style
- Flux: highly photorealistic, often indistinguishable from photos
- Leonardo AI: game-art aesthetic, stylized characters
- Ideogram: strong text generation, graphic design style

Respond ONLY with a valid JSON object, no markdown, no explanation outside JSON:
{
  "is_ai": true or false,
  "confidence": number between 0.0 and 1.0,
  "primary_model": "most likely model name, or null if authentic",
  "possible_models": ["up to 3 possible models if AI, empty array if authentic"],
  "key_indicators": ["up to 4 specific visual clues you observed"],
  "reasoning": "one clear sentence explaining your verdict",
  "generation_style": "photorealistic / artistic / illustration / 3d-render / unknown"
}`,
              },
            ],
          },
        ],
      }),
    });

    const data = await claudeRes.json();

    if (!claudeRes.ok) {
      return res.status(claudeRes.status).json({
        error: `Claude API error: ${claudeRes.status}`,
        details: data,
      });
    }

    // Extract and parse the JSON from Claude's response
    const textBlock = data.content?.find((b) => b.type === "text");
    if (!textBlock) {
      return res.status(500).json({ error: "No text response from Claude" });
    }

    try {
      const clean = textBlock.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      return res.status(200).json(parsed);
    } catch {
      return res.status(200).json({
        is_ai: false,
        confidence: 0.5,
        primary_model: null,
        possible_models: [],
        key_indicators: [],
        reasoning: "Could not parse visual analysis response.",
        generation_style: "unknown",
      });
    }
  } catch (err) {
    console.error("Claude proxy error:", err);
    return res.status(500).json({ error: err.message || "Proxy request failed" });
  }
}

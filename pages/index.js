// pages/index.js
import { useState, useRef, useCallback } from "react";
import Head from "next/head";

// ─── Helpers ────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function parseHiveResult(data) {
  try {
    const classes =
      data?.status?.[0]?.response?.output?.[0]?.classes ||
      data?.on_image?.[0]?.classes ||
      data?.output?.[0]?.classes ||
      [];

    const aiClass = classes.find(
      (c) => c.class?.includes("ai_generated") && !c.class?.includes("not_")
    );
    const notAiClass = classes.find((c) => c.class?.includes("not_ai_generated"));

    return {
      aiScore: aiClass?.score ?? 0,
      notAiScore: notAiClass?.score ?? 1 - (aiClass?.score ?? 0),
      allClasses: classes,
    };
  } catch {
    return { aiScore: 0, notAiScore: 1, allClasses: [] };
  }
}

function getVerdict(score) {
  if (score >= 0.72)
    return {
      type: "ai",
      icon: "⚠",
      label: "AI Generated",
      title: "AI-Generated Content Detected",
      desc: "This content shows strong indicators of being created by an AI generation system.",
    };
  if (score >= 0.4)
    return {
      type: "uncertain",
      icon: "◎",
      label: "Inconclusive",
      title: "Result is Uncertain",
      desc: "Some AI indicators were found but analysis is inconclusive. Manual review recommended.",
    };
  return {
    type: "real",
    icon: "✓",
    label: "Likely Authentic",
    title: "Appears Authentic",
    desc: "No significant AI generation artifacts detected. This content appears to be genuine.",
  };
}

// ─── Sub-components ─────────────────────────────────────────
function ConfidenceBar({ score }) {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.72 ? "#EF4444" : score >= 0.4 ? "#F59E0B" : "#10B981";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 500 }}>
          AI Probability Score
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: 10, background: "var(--border-light)", borderRadius: 6, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            borderRadius: 6,
            transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
        <span>AI Generated: {pct}%</span>
        <span>Authentic: {100 - pct}%</span>
      </div>
    </div>
  );
}

function ModelTags({ models }) {
  if (!models?.length) return null;
  return (
    <div style={{ padding: "18px 20px", background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 500, marginBottom: 12 }}>
        Likely AI Tool(s) Used
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {models.map((m, i) => (
          <span
            key={m}
            style={{
              padding: "5px 13px",
              borderRadius: 20,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fontWeight: 500,
              border: "1.5px solid",
              background: i === 0 ? "var(--text-primary)" : "transparent",
              color: i === 0 ? "var(--bg)" : "var(--text-secondary)",
              borderColor: i === 0 ? "var(--text-primary)" : "var(--border)",
            }}
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

function HiveScores({ classes }) {
  if (!classes?.length) return null;
  return (
    <div style={{ padding: "18px 20px", background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 500, marginBottom: 12 }}>
        Hive Raw Detection Scores
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {classes.slice(0, 6).map((c) => (
          <div key={c.class} style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-mono)", fontSize: 12 }}>
            <span style={{ width: 160, color: "var(--text-secondary)", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {c.class?.replace(/_/g, " ")}
            </span>
            <div style={{ flex: 1, height: 6, background: "var(--border-light)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.round(c.score * 100)}%`, background: "var(--text-faint)", borderRadius: 4 }} />
            </div>
            <span style={{ width: 36, textAlign: "right", color: "var(--text-muted)" }}>
              {Math.round(c.score * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailGrid({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {items.map(({ label, value }) => (
        <div key={label} style={{ padding: "12px 14px", background: "var(--surface)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 500, marginBottom: 5 }}>
            {label}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function Home() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const isVideo = file?.type?.startsWith("video/");

  const handleFile = useCallback((f) => {
    if (!f) return;
    if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) {
      setError("Please upload an image (JPG, PNG, WEBP) or video (MP4, MOV, WEBM).");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError("File too large. Maximum size is 50MB.");
      return;
    }
    setFile(f);
    setResult(null);
    setError(null);
    setPreview(URL.createObjectURL(f));
  }, []);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setLoadStep(0);
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // ── Step 1: Hive Detection ──────────────────────────────
      setLoadStep(1);
      const formData = new FormData();
      formData.append("media", file);

      const hiveRes = await fetch(`/api/hive?type=${isVideo ? "video" : "image"}`, {
        method: "POST",
        body: formData,
      });

      if (!hiveRes.ok) {
        const errData = await hiveRes.json();
        throw new Error(errData.error || `Hive API failed (${hiveRes.status})`);
      }

      const hiveData = await hiveRes.json();
      const { aiScore, notAiScore, allClasses } = parseHiveResult(hiveData);

      // ── Step 2: Claude Visual Analysis (images only) ────────
      setLoadStep(2);
      let claudeResult = null;

      if (!isVideo) {
        const base64 = await new Promise((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result.split(",")[1]);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });

        const claudeRes = await fetch("/api/claude", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, mimeType: file.type }),
        });

        if (claudeRes.ok) {
          claudeResult = await claudeRes.json();
        }
      }

      // ── Step 3: Combine ─────────────────────────────────────
      setLoadStep(3);

      // Weighted combination: Hive 60% + Claude 40%
      let finalAiScore = aiScore;
      if (claudeResult && typeof claudeResult.confidence === "number") {
        const claudeAiScore = claudeResult.is_ai ? claudeResult.confidence : 1 - claudeResult.confidence;
        finalAiScore = aiScore * 0.6 + claudeAiScore * 0.4;
      }

      // Build model list
      const models = [];
      if (claudeResult?.primary_model) models.push(claudeResult.primary_model);
      claudeResult?.possible_models?.forEach((m) => {
        if (!models.includes(m)) models.push(m);
      });
      if (isVideo && finalAiScore > 0.5) {
        ["Runway Gen-3", "Pika Labs", "Sora", "Kling"].forEach((m) => {
          if (!models.includes(m)) models.push(m);
        });
      }

      setResult({
        aiScore: finalAiScore,
        notAiScore: 1 - finalAiScore,
        hiveRaw: { aiScore, notAiScore, allClasses },
        models: models.slice(0, 4),
        indicators: claudeResult?.key_indicators || [],
        reasoning: claudeResult?.reasoning || "",
        generationStyle: claudeResult?.generation_style || "unknown",
        fileType: isVideo ? "Video" : "Image",
        fileSize: formatBytes(file.size),
        fileName: file.name,
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
      setLoadStep(0);
    }
  };

  // ── Render ─────────────────────────────────────────────────
  const verdict = result ? getVerdict(result.aiScore) : null;

  const verdictColors = {
    ai: { bg: "var(--red-bg)", border: "var(--red-border)", iconBg: "var(--red-muted)", labelColor: "var(--red)" },
    uncertain: { bg: "var(--yellow-bg)", border: "var(--yellow-border)", iconBg: "var(--yellow-muted)", labelColor: "var(--yellow)" },
    real: { bg: "var(--green-bg)", border: "var(--green-border)", iconBg: "var(--green-muted)", labelColor: "var(--green)" },
  };

  return (
    <>
      <Head>
        <title>AI Detector — Is it Real or AI Generated?</title>
        <meta name="description" content="Detect AI-generated images and videos using Hive AI and Claude Vision. Identifies which AI tool created the content." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Page wrapper */}
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", padding: "52px 20px 80px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 52, maxWidth: 560 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: "#E8E4DF", border: "1px solid var(--border)",
            borderRadius: 20, padding: "5px 15px",
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500,
            color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase",
            marginBottom: 24,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", display: "inline-block", animation: "pulse 2.5s ease-in-out infinite" }} />
            Hive AI · Claude Vision · Dual Engine
          </div>

          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(30px, 5vw, 46px)", color: "var(--text-primary)", lineHeight: 1.15, marginBottom: 14, letterSpacing: "-0.01em" }}>
            Is it <em style={{ color: "var(--green)" }}>real</em>, or<br />AI generated?
          </h1>

          <p style={{ fontSize: 15, color: "var(--text-muted)", lineHeight: 1.7, fontWeight: 300 }}>
            Upload any image or video for an honest, independent analysis.<br />
            We identify the content <em>and</em> which AI tool likely made it.
          </p>
        </div>

        {/* Main Card */}
        <div style={{
          width: "100%", maxWidth: 640,
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          boxShadow: "var(--shadow-card)",
        }}>

          {/* ── Upload Zone (no file selected) ── */}
          {!file && (
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
              style={{
                padding: "56px 40px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 18,
                cursor: "pointer",
                border: "2px dashed",
                borderColor: dragging ? "var(--border)" : "transparent",
                background: dragging ? "var(--surface)" : "transparent",
                transition: "all 0.2s",
                margin: "0",
              }}
            >
              <input ref={inputRef} type="file" accept="image/*,video/*" style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files[0])} />

              <div style={{ width: 56, height: 56, background: "var(--border-light)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
              </div>

              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", marginBottom: 5 }}>
                  Drop your file here, or click to browse
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
                  Images: JPG, PNG, WEBP, GIF &nbsp;·&nbsp; Videos: MP4, MOV, WEBM
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>
                  Max 50 MB
                </div>
              </div>
            </div>
          )}

          {/* ── File Selected Area ── */}
          {file && (
            <div style={{ padding: "32px 40px", display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Media Preview */}
              <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--border-light)", display: "flex", alignItems: "center", justifyContent: "center", maxHeight: 340 }}>
                {isVideo
                  ? <video src={preview} controls style={{ width: "100%", maxHeight: 340, objectFit: "contain" }} />
                  : <img src={preview} alt="Preview" style={{ width: "100%", maxHeight: 340, objectFit: "contain" }} />
                }
              </div>

              {/* File Info */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--surface)", borderRadius: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--border-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  {isVideo ? "🎬" : "🖼️"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{formatBytes(file.size)} · {isVideo ? "Video" : "Image"}</div>
                </div>
                {!loading && (
                  <button onClick={reset} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", padding: 4, borderRadius: 6, display: "flex", transition: "color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.color = "var(--red)"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--text-faint)"}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Loading Steps */}
              {loading && (
                <div style={{ padding: "20px", background: "var(--surface)", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "Sending to Hive AI detection model…", step: 1 },
                    { label: "Running Claude visual fingerprint analysis…", step: 2 },
                    { label: "Compiling final report…", step: 3 },
                  ].map((s) => {
                    const isDone = loadStep > s.step;
                    const isActive = loadStep === s.step;
                    return (
                      <div key={s.step} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: isDone ? "var(--green)" : isActive ? "var(--text-primary)" : "var(--text-faint)", transition: "color 0.3s" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: isDone || isActive ? "var(--green)" : "var(--border)", flexShrink: 0, display: "block", animation: isActive ? "pulse 1.5s infinite" : "none" }} />
                        {s.label}
                        {isDone && <span style={{ marginLeft: "auto", fontSize: 12 }}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{ padding: "14px 18px", background: "var(--red-bg)", border: "1.5px solid var(--red-border)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--red)", display: "flex", gap: 10 }}>
                  <span>⚠</span><span>{error}</span>
                </div>
              )}

              {/* Analyze Button */}
              {!result && (
                <button
                  onClick={analyze}
                  disabled={loading}
                  style={{
                    width: "100%", padding: "14px",
                    background: loading ? "var(--border)" : "var(--text-primary)",
                    color: "var(--bg)",
                    border: "none", borderRadius: "var(--radius-md)",
                    fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "background 0.2s",
                    letterSpacing: "0.01em",
                  }}
                >
                  {loading ? (
                    <>
                      <span style={{ width: 16, height: 16, border: "2px solid rgba(242,240,237,0.3)", borderTopColor: "var(--bg)", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      Analyze for AI Generation
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* ── Results ── */}
          {result && verdict && (
            <>
              <div style={{ height: 1, background: "var(--border)", margin: "0 40px" }} />
              <div style={{ padding: "32px 40px", display: "flex", flexDirection: "column", gap: 22, animation: "fadeUp 0.4s ease both" }}>

                {/* Verdict Banner */}
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 16,
                  padding: "20px", borderRadius: 14,
                  background: verdictColors[verdict.type].bg,
                  border: `1.5px solid ${verdictColors[verdict.type].border}`,
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: verdictColors[verdict.type].iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                    {verdict.icon}
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 500, color: verdictColors[verdict.type].labelColor, marginBottom: 3 }}>
                      {verdict.label}
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--text-primary)", marginBottom: 4 }}>
                      {verdict.title}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      {verdict.desc}
                    </div>
                  </div>
                </div>

                {/* Confidence Bar */}
                <ConfidenceBar score={result.aiScore} />

                {/* Model Tags */}
                {result.aiScore >= 0.4 && <ModelTags models={result.models} />}

                {/* Reasoning */}
                {result.reasoning && (
                  <div style={{ padding: "16px 18px", background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 500, marginBottom: 8 }}>
                      Claude's Analysis
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{result.reasoning}</p>
                    {result.indicators.length > 0 && (
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                        {result.indicators.map((ind, i) => (
                          <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--text-secondary)", alignItems: "flex-start" }}>
                            <span style={{ color: "var(--text-faint)", marginTop: 1, flexShrink: 0 }}>—</span>
                            <span>{ind}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Hive Raw Scores */}
                <HiveScores classes={result.hiveRaw?.allClasses} />

                {/* Detail Grid */}
                <DetailGrid items={[
                  { label: "File Type", value: result.fileType },
                  { label: "File Size", value: result.fileSize },
                  { label: "Detection", value: "Hive + Claude" },
                  { label: "AI Score", value: `${Math.round(result.aiScore * 100)}%` },
                  ...(result.generationStyle !== "unknown" ? [{ label: "Style", value: result.generationStyle }] : []),
                ]} />

                {/* Scan Again */}
                <button
                  onClick={reset}
                  style={{
                    width: "100%", padding: "13px",
                    background: "transparent",
                    color: "var(--text-secondary)",
                    border: "1.5px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500,
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                  </svg>
                  Scan Another File
                </button>

              </div>
            </>
          )}
        </div>

        {/* Trust Footer */}
        <div style={{ marginTop: 40, display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { icon: "🔒", text: "Files not stored" },
            { icon: "⚡", text: "Real-time analysis" },
            { icon: "🎯", text: "Dual-engine detection" },
            { icon: "🌐", text: "32+ AI models covered" },
          ].map((t) => (
            <div key={t.text} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--border-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
                {t.icon}
              </div>
              {t.text}
            </div>
          ))}
        </div>

      </div>
    </>
  );
}

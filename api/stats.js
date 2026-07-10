// Lectura pública de estadísticas agregadas (no incrementa nada).
// Devuelve total, visitas por día y por país. Sin datos personales, sin cookies.
const TOTAL = "nombretorio:visits:total";
const COUNTRIES = "nombretorio:visits:countries";
const DAYS = "nombretorio:visits:days";

function kv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

async function pipeline(commands) {
  const { url, token } = kv();
  if (!url || !token) return null;
  const r = await fetch(url + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error("KV " + r.status + ": " + (await r.text()));
  return r.json();
}

function hashToObj(h) {
  const o = {};
  if (!h) return o;
  if (Array.isArray(h)) {
    for (let i = 0; i < h.length; i += 2) o[h[i]] = Number(h[i + 1]) || 0;
  } else if (typeof h === "object") {
    for (const k in h) o[k] = Number(h[k]) || 0;
  }
  return o;
}

export default async function handler(req, res) {
  res.setHeader("cache-control", "no-store, max-age=0");
  try {
    const p = await pipeline([
      ["GET", TOTAL],
      ["HGETALL", DAYS],
      ["HGETALL", COUNTRIES],
    ]);
    if (!p) {
      res.status(200).json({ configured: false });
      return;
    }
    const total = Number((p[0] && p[0].result) || 0);
    const days = hashToObj(p[1] && p[1].result);
    const countries = hashToObj(p[2] && p[2].result);
    res.status(200).json({ configured: true, total, days, countries });
  } catch (e) {
    res.status(200).json({ configured: false, error: String((e && e.message) || e) });
  }
}

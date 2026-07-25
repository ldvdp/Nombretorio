// Cuenta cuántas veces se abre la ficha de cada nombre (agregado, sin cookies ni
// datos personales) para el ranking "nombres más vistos". Se llama por beacon
// desde el cliente al abrir una ficha. Guarda un sorted set: nombretorio:views.
const VIEWS = "nombretorio:views";

function kv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

const tkey = (s) => (s + "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const slugify = (s) => tkey(s).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default async function handler(req, res) {
  res.setHeader("cache-control", "no-store, max-age=0");
  const raw = (req.query && (req.query.n || req.query.name)) || "";
  const name = decodeURIComponent(Array.isArray(raw) ? raw[0] : raw).trim();
  const slug = slugify(name);
  if (!slug) { res.status(200).json({ ok: false }); return; }
  const { url, token } = kv();
  if (!url || !token) { res.status(200).json({ ok: false, configured: false }); return; }
  try {
    // guardamos el nombre "bonito" en un hash aparte para mostrarlo luego con tildes
    await fetch(url + "/pipeline", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["ZINCRBY", VIEWS, "1", slug],
        ["HSET", VIEWS + ":labels", slug, name],
      ]),
    });
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(200).json({ ok: false });
  }
}

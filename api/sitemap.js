// /sitemap.xml : una URL por nombre con ranking, para que Google descubra las fichas.
// Se extraen del propio index.html (misma fuente de verdad que api/name.js).
import fs from "fs";
import path from "path";

const SITE = "https://nombretorio.vercel.app";
let CACHE = null;

const tkey = (s) => (s + "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const slugify = (s) => tkey(s).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function readIndex(host) {
  for (const p of [path.join(process.cwd(), "index.html"), "/var/task/index.html"]) {
    try { return fs.readFileSync(p, "utf8"); } catch (e) { /* siguiente */ }
  }
  const proto = host && host.startsWith("localhost") ? "http" : "https";
  const r = await fetch(`${proto}://${host}/index.html`);
  if (!r.ok) throw new Error("no se pudo leer index.html: " + r.status);
  return r.text();
}

function slugs(html) {
  const set = new Set();
  for (const key of ["M5K", "W5K"]) {
    const m = html.match(new RegExp("const " + key + "=(\\[[\\s\\S]*?\\]);"));
    if (!m) continue;
    let arr;
    try { arr = JSON.parse(m[1]); } catch (e) { continue; }
    for (const row of arr) {
      const s = slugify(row[0]);
      if (s) set.add(s);
    }
  }
  return [...set].sort();
}

export default async function handler(req, res) {
  try {
    const html = await readIndex(req.headers.host);
    if (!CACHE) CACHE = slugs(html);
    const urls = [`<url><loc>${SITE}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`]
      .concat(CACHE.map((s) => `<url><loc>${SITE}/nombre/${s}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>`));
    res.setHeader("content-type", "application/xml; charset=utf-8");
    res.setHeader("cache-control", "public, s-maxage=86400, stale-while-revalidate=604800");
    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`);
  } catch (e) {
    res.status(500).send("error");
  }
}

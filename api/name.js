// Sirve /nombre/<slug> : el MISMO index.html pero con <title> y meta og/twitter
// propios de ese nombre. Asi el enlace compartido enseña una vista previa real y
// Google puede indexar cada nombre (el fragmento #... nunca llega al servidor).
//
// Una sola fuente de verdad: los datos se extraen del propio index.html que hay
// que devolver de todas formas, y se cachean por instancia.
import fs from "fs";
import path from "path";

const SITE = "https://nombretorio.vercel.app";
let CACHE = null;

const ENT = {
  aacute:"á", eacute:"é", iacute:"í", oacute:"ó", uacute:"ú", ntilde:"ñ", uuml:"ü",
  Aacute:"Á", Eacute:"É", Iacute:"Í", Oacute:"Ó", Uacute:"Ú", Ntilde:"Ñ", Uuml:"Ü",
  ccedil:"ç", Ccedil:"Ç", agrave:"à", egrave:"è", igrave:"ì", ograve:"ò", ugrave:"ù",
  auml:"ä", ouml:"ö", euml:"ë", iuml:"ï", acirc:"â", ecirc:"ê", icirc:"î", ocirc:"ô", ucirc:"û",
  amp:"&", quot:'"', apos:"'", middot:"·", hellip:"…", mdash:"—", ndash:"–", nbsp:" ",
};
function decodeEnt(s) {
  return (s + "")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, k) => (ENT[k] !== undefined ? ENT[k] : m));
}
const tkey = (s) => (s + "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const slugify = (s) => tkey(s).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const esc = (s) => (s + "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function readIndex(host) {
  const tries = [
    path.join(process.cwd(), "index.html"),
    path.join(process.cwd(), "public", "index.html"),
    "/var/task/index.html",
  ];
  for (const p of tries) {
    try { return fs.readFileSync(p, "utf8"); } catch (e) { /* siguiente */ }
  }
  // Respaldo: pedirlo por HTTP al propio despliegue (no esta reescrito, sirve el estatico)
  const proto = host && host.startsWith("localhost") ? "http" : "https";
  const r = await fetch(`${proto}://${host}/index.html`);
  if (!r.ok) throw new Error("no se pudo leer index.html: " + r.status);
  return r.text();
}

function buildIndex(html) {
  // TILDES: objeto JS con claves sin comillas -> se lee con regex, no con JSON.parse
  const T = {};
  const tm = html.match(/const TILDES=\{([\s\S]*?)\};/);
  if (tm) {
    const re = /([A-Za-z0-9_]+)\s*:\s*'([^']*)'/g;
    let m;
    while ((m = re.exec(tm[1]))) T[m[1]] = m[2];
  }
  const disp = (n) => (n + "").split(" ").map((w) => T[tkey(w)] || w).join(" ");

  const idx = new Map();
  const addRanked = (json, gender) => {
    let arr;
    try { arr = JSON.parse(json); } catch (e) { return; }
    for (const row of arr) {
      const raw = row[0], rank = row[1], total = row[2];
      const s = slugify(raw);
      if (!s) continue;
      const prev = idx.get(s);
      // si el nombre existe en ambas listas nos quedamos con el genero dominante
      if (prev && prev.total >= total) continue;
      idx.set(s, { display: disp(raw), rank, total, gender });
    }
  };
  const m5 = html.match(/const M5K=(\[[\s\S]*?\]);/);
  const w5 = html.match(/const W5K=(\[[\s\S]*?\]);/);
  if (m5) addRanked(m5[1], "n");
  if (w5) addRanked(w5[1], "f");

  // Nombres de las pestañas especiales (sin ranking): {n:'Cuauht&eacute;moc',...}
  const re = /\{n:'([^']*)'/g;
  let m;
  while ((m = re.exec(html))) {
    const nm = decodeEnt(m[1]);
    const s = slugify(nm);
    if (s && !idx.has(s)) idx.set(s, { display: nm, rank: null, total: null, gender: "" });
  }
  return idx;
}

function metaFor(entry, slug) {
  const name = entry ? entry.display : "";
  const title = `${name} · significado, origen y popularidad · Nombretorio`;
  let desc;
  if (entry && entry.rank != null && entry.total != null) {
    // OJO: M5K/W5K son PERSONAS vivas con ese nombre (INE, todas las edades), no nacimientos.
    desc = `${name} es el nombre nº ${entry.rank} de España: ${Number(entry.total).toLocaleString("es-ES")} personas se llaman así. Consulta su evolución desde 2003, su significado y sus equivalentes en otros idiomas.`;
  } else {
    desc = `${name}: significado, origen y datos del nombre. Evolución en España desde 2003 y equivalentes en otros idiomas.`;
  }
  // La imagen se genera al vuelo (api/og.js) con estos mismos datos: no carga nada, solo dibuja.
  const q = new URLSearchParams({ n: name });
  if (entry && entry.rank != null) q.set("r", String(entry.rank));
  if (entry && entry.total != null) q.set("p", String(entry.total));
  if (entry && entry.gender) q.set("g", entry.gender);
  return { title, desc, url: `${SITE}/nombre/${slug}`, img: `${SITE}/api/og?${q.toString()}` };
}

function patch(html, { title, desc, url, img }, name, noindex) {
  const t = esc(title), d = esc(desc), u = esc(url), im = esc(img);
  let out = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${d}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${t}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${d}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${u}">`)
    .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${im}">`)
    .replace(/<meta property="og:image:secure_url" content="[^"]*">/, `<meta property="og:image:secure_url" content="${im}">`)
    .replace(/<meta property="og:image:type" content="[^"]*">/, `<meta property="og:image:type" content="image/png">`)
    .replace(/<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${esc(name)} &middot; Nombretorio">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${t}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${d}">`)
    .replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${im}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${u}">`);
  const inject =
    (noindex ? '<meta name="robots" content="noindex">' : "") +
    `<script>window.__NAME__=${JSON.stringify(name)};</script>`;
  return out.replace("</head>", inject + "</head>");
}

export default async function handler(req, res) {
  const raw = (req.query && (req.query.n || req.query.name)) || "";
  const slug = slugify(decodeURIComponent(Array.isArray(raw) ? raw[0] : raw));
  try {
    const html = await readIndex(req.headers.host);
    if (!CACHE) CACHE = buildIndex(html);
    const entry = CACHE.get(slug);
    // nombre desconocido: servimos la web igual, pero sin indexar (no generamos URLs basura)
    const name = entry ? entry.display : slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const meta = metaFor(entry || { display: name, rank: null, total: null }, slug);
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.setHeader("cache-control", entry ? "public, s-maxage=86400, stale-while-revalidate=604800" : "public, s-maxage=60");
    res.status(entry ? 200 : 404).send(patch(html, meta, name, !entry));
  } catch (e) {
    res.setHeader("location", "/");
    res.status(302).end();
  }
}

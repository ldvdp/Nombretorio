// Sirve /nombre/<slug> : el MISMO index.html pero con <title>, meta og/twitter y
// EL CONTENIDO DEL NOMBRE ya escrito en el HTML. Sin esto, las ~9.900 fichas
// tenian el <body> identico (solo cambiaban las meta) y Google las habria visto
// como duplicadas; ademas asi la ficha se lee sin ejecutar JS.
//
// Una sola fuente de verdad: todo se extrae del propio index.html que hay que
// devolver de todas formas, y se cachea por instancia.
import fs from "fs";
import path from "path";

const SITE = "https://nombretorio.vercel.app";
let CACHE = null;

const ENT = {
  aacute:"á", eacute:"é", iacute:"í", oacute:"ó", uacute:"ú", ntilde:"ñ", uuml:"ü",
  Aacute:"Á", Eacute:"É", Iacute:"Í", Oacute:"Ó", Uacute:"Ú", Ntilde:"Ñ", Uuml:"Ü",
  ccedil:"ç", Ccedil:"Ç", agrave:"à", egrave:"è", igrave:"ì", ograve:"ò", ugrave:"ù",
  atilde:"ã", otilde:"õ", auml:"ä", ouml:"ö", euml:"ë", iuml:"ï",
  acirc:"â", ecirc:"ê", icirc:"î", ocirc:"ô", ucirc:"û",
  amp:"&", quot:'"', apos:"'", middot:"·", hellip:"…", mdash:"—", ndash:"–", nbsp:" ",
};
function decodeEnt(s) {
  return (s + "")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, k) => (ENT[k] !== undefined ? ENT[k] : m));
}
const unesc = (s) => (s + "").replace(/\\'/g, "'").replace(/\\\\/g, "\\");
const tkey = (s) => (s + "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const slugify = (s) => tkey(s).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const esc = (s) => (s + "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (n) => Number(n).toLocaleString("es-ES");

async function readIndex(host) {
  for (const p of [path.join(process.cwd(), "index.html"), path.join(process.cwd(), "public", "index.html"), "/var/task/index.html"]) {
    try { return fs.readFileSync(p, "utf8"); } catch (e) { /* siguiente */ }
  }
  const proto = host && host.startsWith("localhost") ? "http" : "https";
  const r = await fetch(`${proto}://${host}/index.html`);
  if (!r.ok) throw new Error("no se pudo leer index.html: " + r.status);
  return r.text();
}

function buildIndex(html) {
  // TILDES: objeto JS con claves sin comillas -> regex, no JSON.parse
  const T = {};
  const tm = html.match(/const TILDES=\{([\s\S]*?)\};/);
  if (tm) {
    const re = /([A-Za-z0-9_]+)\s*:\s*'([^']*)'/g;
    let m;
    while ((m = re.exec(tm[1]))) T[m[1]] = m[2];
  }
  const disp = (n) => (n + "").split(" ").map((w) => T[tkey(w)] || w).join(" ");

  const idx = new Map();
  // M5K/W5K -> PERSONAS vivas (INE, todas las edades). Es la metrica del ranking.
  const addRanked = (json, gender) => {
    let arr;
    try { arr = JSON.parse(json); } catch (e) { return; }
    for (const row of arr) {
      const s = slugify(row[0]);
      if (!s) continue;
      const prev = idx.get(s);
      if (prev && prev.total >= row[2]) continue; // nos quedamos con el genero dominante
      idx.set(s, { display: disp(row[0]), rank: row[1], total: row[2], gender, births: prev ? prev.births : null });
    }
  };
  const m5 = html.match(/const M5K=(\[[\s\S]*?\]);/);
  const w5 = html.match(/const W5K=(\[[\s\S]*?\]);/);
  if (m5) addRanked(m5[1], "n");
  if (w5) addRanked(w5[1], "f");

  // BB/BG.t -> NACIMIENTOS 2003-2023 (metrica distinta a la de arriba). Son JSON.
  const addBirths = (json, gender) => {
    try {
      for (const x of JSON.parse(json)) {
        const e = idx.get(slugify(x.n));
        if (e && e.gender === gender) e.births = x.t;
      }
    } catch (e) { /* opcional */ }
  };
  const bb = html.match(/const BB=(\[[\s\S]*?\]);/);
  const bg = html.match(/const BG=(\[[\s\S]*?\]);/);
  if (bb) addBirths(bb[1], "n");
  if (bg) addBirths(bg[1], "f");

  // Significados de las pestañas especiales: {n:'..',k:'..',cat:'..',d:'..'} con
  // comillas escapadas y, a veces, flags extra despues de d (p.ej. u:1 unisex).
  // Se recorre bloque a bloque y se parte por ",f:[" para saber el genero.
  const MEAN = new Map();
  const scanItems = (txt, gender) => {
    const reIt = /\{n:'((?:[^'\\]|\\.)*)',k:'[^']*',cat:'((?:[^'\\]|\\.)*)',d:'((?:[^'\\]|\\.)*)'[^}]*\}/g;
    let it;
    while ((it = reIt.exec(txt))) {
      const nm = decodeEnt(unesc(it[1]));
      const s = slugify(nm);
      if (!s) continue;
      if (!MEAN.has(s)) MEAN.set(s, { cat: decodeEnt(unesc(it[2])), d: decodeEnt(unesc(it[3])) });
      if (!idx.has(s)) idx.set(s, { display: nm, rank: null, total: null, gender, births: null });
    }
  };
  const reBlk = /const (?:HIST|COUNTRY|WORLD|ORIGEN|BIBLICAL)_DATA=\{([\s\S]*?)\};/g;
  let blk;
  while ((blk = reBlk.exec(html))) {
    const body = blk[1];
    const f = body.search(/,f:\[/);
    if (f >= 0) { scanItems(body.slice(0, f), "n"); scanItems(body.slice(f), "f"); }
    else scanItems(body, "n");
  }

  // MEAN_ES: diccionario de etimologías {clave:["Origen","Significado."]} (JSON válido)
  const mm = html.match(/const MEAN_ES=(\{[\s\S]*?\});/);
  if (mm) {
    try {
      const dict = JSON.parse(mm[1]);
      for (const k in dict) {
        if (!MEAN.has(k)) MEAN.set(k, { cat: dict[k][0], d: dict[k][1] });
      }
    } catch (e) { /* si falla, seguimos sin etimologías */ }
  }

  // MULTI_DATA={Juan:{"Euskera":'Jon',...},...} -> claves sin comillas, valores con entidades
  const TRANS = new Map();
  const md = html.match(/const MULTI_DATA=\{([\s\S]*?)\};/);
  if (md) {
    const reN = /([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' ]*?)\s*:\s*\{([^{}]*)\}/g;
    let x;
    while ((x = reN.exec(md[1]))) {
      const o = {};
      const reP = /"([^"]+)"\s*:\s*'((?:[^'\\]|\\.)*)'/g;
      let p;
      while ((p = reP.exec(x[2]))) o[decodeEnt(p[1])] = decodeEnt(unesc(p[2]));
      const s = slugify(decodeEnt(x[1]));
      if (s && Object.keys(o).length) TRANS.set(s, o);
    }
  }

  // Orden por ranking dentro de cada género, para enlazar nombres cercanos en popularidad.
  const order = { n: [], f: [] };
  for (const [s, e] of idx)
    if (e.rank != null && (e.gender === "n" || e.gender === "f"))
      order[e.gender].push({ slug: s, display: e.display, rank: e.rank });
  order.n.sort((a, b) => a.rank - b.rank);
  order.f.sort((a, b) => a.rank - b.rank);

  return { idx, MEAN, TRANS, order };
}

// Nombres relacionados: vecinos en el ranking del mismo género (igual de populares).
// Si no hay ranking (nombres especiales), caen a otros con la misma inicial.
function relatedFor(slug, entry, order) {
  const g = entry.gender;
  if ((g === "n" || g === "f") && entry.rank != null) {
    const list = order[g];
    const pos = list.findIndex((x) => x.slug === slug);
    if (pos >= 0) {
      const out = [];
      for (let d = 1; out.length < 8 && d < list.length; d++) {
        if (list[pos + d]) out.push(list[pos + d]);
        if (list[pos - d] && out.length < 8) out.push(list[pos - d]);
      }
      return out;
    }
  }
  const init = (slug || "")[0];
  const pool = order.n.concat(order.f).filter((x) => x.slug[0] === init && x.slug !== slug);
  pool.sort((a, b) => a.rank - b.rank);
  return pool.slice(0, 8);
}

function metaFor(entry, slug) {
  const name = entry.display;
  const title = `${name} · significado, origen y popularidad · Nombretorio`;
  const desc =
    entry.rank != null && entry.total != null
      ? `${name} es el nombre nº ${entry.rank} de España: ${num(entry.total)} personas se llaman así. Consulta su evolución desde 2003, su significado y sus equivalentes en otros idiomas.`
      : `${name}: significado, origen y datos del nombre. Evolución en España desde 2003 y equivalentes en otros idiomas.`;
  const q = new URLSearchParams({ n: name });
  if (entry.rank != null) q.set("r", String(entry.rank));
  if (entry.total != null) q.set("p", String(entry.total));
  if (entry.gender) q.set("g", entry.gender);
  return { title, desc, url: `${SITE}/nombre/${slug}`, img: `${SITE}/api/og?${q.toString()}` };
}

// Contenido real de la ficha, en HTML. El JS lo reemplaza por la version rica
// (tarjetas + grafico) al cargar; esto es lo que ven los buscadores y quien no
// tenga JS, y es lo que hace que cada pagina sea unica.
function seoBlock(entry, mean, trans, related) {
  const n = esc(entry.display);
  const g = entry.gender;
  const gTxt = g === "n" ? "un nombre de niño" : g === "f" ? "un nombre de niña" : g === "u" ? "un nombre unisex" : "un nombre";
  let lead = `<strong>${n}</strong> es ${gTxt}.`;
  if (entry.rank != null && entry.total != null)
    lead += ` Ocupa el puesto nº ${entry.rank} en España, donde ${num(entry.total)} personas se llaman así.`;
  if (entry.births != null)
    lead += ` Entre 2003 y 2023 se registraron ${num(entry.births)} nacimientos con este nombre.`;
  const H = 'style="font-family:Cinzel,serif;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:#b0872c;margin:14px 0 6px;text-align:center"';
  let h = `<p style="font-size:.86rem;line-height:1.6;color:#4a4236;margin:10px 0">${lead}</p>`;
  if (mean)
    h += `<h2 ${H}>Significado y origen</h2><p style="font-size:.82rem;line-height:1.55;color:#4a4236;background:#fff;border:1px solid #ece0c8;border-radius:11px;padding:8px 11px">${esc(mean.cat)} ${esc(mean.d)}</p>`;
  if (trans) {
    const li = Object.keys(trans).slice(0, 10)
      .map((k) => `<li style="display:inline-block;font-size:.72rem;background:#fff;border:1px solid #ece0c8;border-radius:20px;padding:4px 11px;margin:0 4px 5px 0;color:#8a8072"><strong style="color:#2a2118">${esc(trans[k])}</strong> ${esc(k)}</li>`)
      .join("");
    h += `<h2 ${H}>${n} en otros idiomas</h2><ul style="list-style:none;padding:0;margin:0;text-align:center">${li}</ul>`;
  }
  if (related && related.length) {
    const links = related
      .map((r) => `<a href="/nombre/${r.slug}" style="display:inline-block;font-size:.78rem;background:#fff;border:1px solid #ece0c8;border-radius:20px;padding:5px 12px;margin:0 5px 6px 0;color:#7a4a3a;text-decoration:none">${esc(r.display)}</a>`)
      .join("");
    h += `<h2 ${H}>Nombres relacionados</h2><nav style="text-align:center">${links}</nav>`;
  }
  h += `<p style="text-align:center;margin:14px 0 0"><a href="/" style="font-size:.76rem;color:#b0872c;text-decoration:none">‹ Explorar todos los nombres</a></p>`;
  return h;
}

function jsonLd(entry, meta) {
  const crumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: entry.display },
    ],
  };
  const page = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: meta.title,
    description: meta.desc,
    url: meta.url,
    inLanguage: "es-ES",
    primaryImageOfPage: meta.img,
    isPartOf: { "@type": "WebSite", name: "Nombretorio", url: SITE + "/" },
  };
  const s = JSON.stringify([crumb, page]).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${s}</script>`;
}

function patch(html, meta, entry, seo, noindex) {
  const t = esc(meta.title), d = esc(meta.desc), u = esc(meta.url), im = esc(meta.img);
  let out = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${d}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${t}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${d}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${u}">`)
    .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${im}">`)
    .replace(/<meta property="og:image:secure_url" content="[^"]*">/, `<meta property="og:image:secure_url" content="${im}">`)
    .replace(/<meta property="og:image:type" content="[^"]*">/, `<meta property="og:image:type" content="image/png">`)
    .replace(/<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${esc(entry.display)} &middot; Nombretorio">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${t}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${d}">`)
    .replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${im}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${u}">`);

  // La ficha, ya rellena y visible sin JS. El nombre pasa a <h1> (era un <div>):
  // asi el encabezado principal de la pagina es el nombre, no "Nombretorio".
  out = out
    .replace('<div class="shm-name" id="shmName"></div>', `<h1 class="shm-name" id="shmName">${esc(entry.display)}</h1>`)
    .replace('<div class="shm-detail" id="shmDetail"></div>', `<div class="shm-detail" id="shmDetail">${seo}</div>`);

  const inject =
    (noindex ? '<meta name="robots" content="noindex">' : "") +
    "<style>#shareModal{display:flex}</style>" +
    (noindex ? "" : jsonLd(entry, meta)) +
    `<script>window.__NAME__=${JSON.stringify(entry.display)};</script>`;
  return out.replace("</head>", inject + "</head>");
}

export default async function handler(req, res) {
  const raw = (req.query && (req.query.n || req.query.name)) || "";
  const slug = slugify(decodeURIComponent(Array.isArray(raw) ? raw[0] : raw));
  try {
    const html = await readIndex(req.headers.host);
    if (!CACHE) CACHE = buildIndex(html);
    const found = CACHE.idx.get(slug);
    // slug desconocido: servimos la web igual pero sin indexar (nada de URLs basura)
    const entry = found || {
      display: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      rank: null, total: null, gender: "", births: null,
    };
    const related = found ? relatedFor(slug, entry, CACHE.order) : [];
    // los compuestos ("maria-carmen") heredan la etimología de su primera palabra
    const mean = CACHE.MEAN.get(slug) || CACHE.MEAN.get(slug.split("-")[0]);
    const seo = seoBlock(entry, mean, CACHE.TRANS.get(slug), related);
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.setHeader("cache-control", found ? "public, s-maxage=86400, stale-while-revalidate=604800" : "public, s-maxage=60");
    res.status(found ? 200 : 404).send(patch(html, metaFor(entry, slug), entry, seo, !found));
  } catch (e) {
    res.setHeader("location", "/");
    res.status(302).end();
  }
}

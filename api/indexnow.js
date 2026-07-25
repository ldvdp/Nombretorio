// Avisa a IndexNow (Bing, Yandex, etc.) de URLs nuevas/actualizadas, para que se
// reindexen en horas en vez de esperar al rastreo. GET /api/indexnow?key=<clave>
// - sin ?urls=  -> envía la home + una muestra de fichas de nombres populares.
// - ?urls=a,b,c -> envía esas rutas (relativas o absolutas del propio dominio).
// La clave (INDEXNOW_KEY) protege el endpoint: solo quien la conoce puede dispararlo.
const HOST = "nombretorio.vercel.app";
const KEY = "370134ae2645a1103267284c9d4088fb";

// Fichas "estrella" para el ping por defecto (nombres muy buscados).
const SAMPLE = [
  "lucia", "alejandro", "martina", "hugo", "sofia", "mateo", "maria",
  "daniel", "lucas", "paula", "pablo", "julia", "leo", "emma", "alba",
];

export default async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  const given = (req.query && req.query.key) || "";
  if (given !== KEY) {
    res.status(403).json({ ok: false, error: "clave incorrecta o ausente (?key=...)" });
    return;
  }

  let list;
  const raw = req.query && req.query.urls;
  if (raw) {
    list = (Array.isArray(raw) ? raw.join(",") : raw).split(",").map((s) => s.trim()).filter(Boolean);
  } else {
    list = ["/"].concat(SAMPLE.map((s) => "/nombre/" + s));
  }
  const urlList = list.slice(0, 10000).map((u) =>
    /^https?:\/\//i.test(u) ? u : "https://" + HOST + (u.startsWith("/") ? u : "/" + u)
  );

  const body = {
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList,
  };

  try {
    const r = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
    res.status(200).json({ ok: r.ok, status: r.status, enviadas: urlList.length, urls: urlList });
  } catch (e) {
    res.status(200).json({ ok: false, error: String((e && e.message) || e), enviadas: 0 });
  }
}

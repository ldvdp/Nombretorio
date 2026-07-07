const TOTAL_KEY = "nombretorio:visits:total";
const COUNTRIES_KEY = "nombretorio:visits:countries";

const COUNTRY_LABELS = {
  XX: "Sin geolocalizar",
  ES: "Espana",
  US: "Estados Unidos",
  MX: "Mexico",
  AR: "Argentina",
  CO: "Colombia",
  FR: "Francia",
  IT: "Italia",
  PT: "Portugal",
  DE: "Alemania",
  GB: "Reino Unido",
  NL: "Paises Bajos",
  SE: "Suecia",
  NO: "Noruega",
  DK: "Dinamarca",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
    },
  });
}

function getGeo(request) {
  const header = (name) => request.headers.get(name) || "";
  const country = (header("x-vercel-ip-country") || header("x-country") || "XX").toUpperCase();
  const city = header("x-vercel-ip-city") || "";
  const region = header("x-vercel-ip-country-region") || "";
  return { country, city, region };
}

async function runPipeline(commands) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    return null;
  }

  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upstash error ${response.status}: ${text}`);
  }

  return response.json();
}

function toTopCountries(hashResult) {
  const entries = Object.entries(hashResult || {})
    .map(([code, count]) => ({ code, count: Number(count) || 0 }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

  return entries.slice(0, 8);
}

function buildDemoPayload(geo) {
  return {
    ok: true,
    storage: "demo",
    total: null,
    country: geo.country,
    city: geo.city,
    region: geo.region,
    countriesTracked: null,
    topCountries: geo.country ? [{ code: geo.country, count: 1 }] : [],
    updatedAt: new Date().toISOString(),
    labels: COUNTRY_LABELS,
    message: "Configura KV_REST_API_URL y KV_REST_API_TOKEN para activar el contador persistente.",
  };
}

export async function GET(request) {
  const geo = getGeo(request);

  try {
    const pipeline = await runPipeline([
      ["INCR", TOTAL_KEY],
      ["HINCRBY", COUNTRIES_KEY, geo.country, 1],
      ["GET", TOTAL_KEY],
      ["HGETALL", COUNTRIES_KEY],
    ]);

    if (!pipeline) {
      return json(buildDemoPayload(geo));
    }

    const total = Number(pipeline[2]?.result || pipeline[0]?.result || 0);
    const countries = pipeline[3]?.result || {};
    const topCountries = toTopCountries(countries);

    return json({
      ok: true,
      storage: "kv",
      total,
      country: geo.country,
      city: geo.city,
      region: geo.region,
      countriesTracked: Object.keys(countries).length,
      topCountries,
      updatedAt: new Date().toISOString(),
      labels: COUNTRY_LABELS,
    });
  } catch (error) {
    return json(
      {
        ok: false,
        storage: "error",
        message: error instanceof Error ? error.message : "Unexpected error",
        ...buildDemoPayload(geo),
      },
      200
    );
  }
}

// Imagen de vista previa (1200x630) por nombre, para WhatsApp/X/Telegram.
// api/name.js le pasa ya los datos por query, asi que aqui no se carga nada:
// solo se dibuja. Sin JSX (no hay build): Satori acepta el arbol como objetos.
import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

const GOLD = "#f3cd80";
let FONT = null;

async function font(origin) {
  if (!FONT) {
    const r = await fetch(`${origin}/cinzel-700.ttf`);
    if (!r.ok) throw new Error("font " + r.status);
    FONT = await r.arrayBuffer();
  }
  return FONT;
}

const el = (type, props, ...children) => ({
  type,
  props: { ...props, children: children.length > 1 ? children : children[0] },
});

function card({ name, sub, tag }) {
  return el(
    "div",
    {
      style: {
        width: "1200px", height: "630px", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", position: "relative",
        backgroundColor: "#140f1c",
        backgroundImage:
          "radial-gradient(circle at 50% 118%, rgba(255,200,120,.55), rgba(239,143,62,.22) 32%, rgba(20,15,28,0) 62%)",
        fontFamily: "Cinzel",
      },
    },
    // poso oscuro al pie: en degradado, para que no quede un canto duro cruzando la imagen
    el("div", {
      style: {
        position: "absolute", bottom: 0, left: 0, width: "1200px", height: "230px",
        backgroundImage: "linear-gradient(180deg, rgba(16,12,24,0), rgba(16,12,24,.92))",
      },
    }),
    tag
      ? el("div", { style: { fontSize: 25, letterSpacing: 7, color: "rgba(235,205,155,.72)", marginBottom: 16, display: "flex" } }, tag)
      : null,
    el(
      "div",
      {
        style: {
          fontSize: name.length > 14 ? 92 : name.length > 10 ? 116 : 138,
          fontWeight: 700, color: GOLD, lineHeight: 1.1, padding: "0 60px",
          textAlign: "center", display: "flex", maxWidth: "1080px",
        },
      },
      name
    ),
    el("div", { style: { width: "300px", height: "2px", backgroundColor: "rgba(202,161,78,.75)", margin: "26px 0" } }),
    sub
      ? el("div", { style: { fontSize: 31, color: "rgba(245,230,205,.9)", textAlign: "center", padding: "0 80px", display: "flex" } }, sub)
      : null,
    el("div", { style: { position: "absolute", bottom: 26, fontSize: 21, letterSpacing: 3, color: "rgba(233,205,155,.55)", display: "flex" } }, "nombretorio.vercel.app")
  );
}

export default async function handler(req) {
  try {
    const u = new URL(req.url);
    const origin = u.origin;
    // Recortamos: estos valores acaban dibujados en una imagen de nuestro dominio.
    const name = (u.searchParams.get("n") || "Nombretorio").slice(0, 28);
    const rank = u.searchParams.get("r");
    const people = u.searchParams.get("p");
    const g = u.searchParams.get("g");

    const bits = [];
    if (rank && /^\d+$/.test(rank)) bits.push(`nº ${rank} de España`);
    if (people && /^\d+$/.test(people)) bits.push(`${Number(people).toLocaleString("es-ES")} personas`);
    const sub = bits.join("  ·  ") || "significado, origen y popularidad";
    const tag = g === "n" ? "NOMBRE DE NIÑO" : g === "f" ? "NOMBRE DE NIÑA" : g === "u" ? "NOMBRE UNISEX" : "EXPLORADOR DE NOMBRES";

    return new ImageResponse(card({ name, sub, tag }), {
      width: 1200,
      height: 630,
      fonts: [{ name: "Cinzel", data: await font(origin), weight: 700, style: "normal" }],
      headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (e) {
    // si algo falla, que el enlace caiga en la portada generica y no en un roto
    return Response.redirect(new URL("/og.jpg", req.url), 302);
  }
}

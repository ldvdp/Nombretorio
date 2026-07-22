# Fuentes de datos por país

Cada `data/<code>.json` tiene la misma forma:
`{ meta:{code,name,flag,y0,yN,metric,metricLabel,source}, BB, BG, M5K, W5K }`

- `BB`/`BG` = tendencias niños/niñas: `{n, t, y:[serie y0..yN], pk}` (una entrada por año).
- `M5K`/`W5K` = ranking completo niños/niñas: `[[nombre, rango, total], …]`.
- `y0`/`yN` = primer y último año de la serie (la app se adapta a cualquier longitud).
- `metric`/`metricLabel` = qué mide el "total" (personas censadas vs nacimientos).

**España va embebida** en `index.html` (INE). El resto se cargan bajo demanda al
seleccionarlos. Añadir un país = construir su `data/<code>.json` + una `<option>`
en cada uno de los 2 selectores (`countrySel` y `countrySel5`) de `01_Web/Nombretorio.html`.

Los nombres se guardan en Título (Mayúscula inicial) tal como los da cada fuente;
los acentos/caracteres propios se preservan (é, ñ, ø, ł…). `disp()` solo añade
tildes a España (INE los da sin tilde); los demás países ya vienen acentuados.

| País | Fichero | Fuente | Descarga | Ventana | Métrica del "total" |
|------|---------|--------|----------|---------|---------------------|
| 🇪🇸 España | (embebido) | INE (padrón) | — | 2003–2023 | personas censadas vivas |
| 🇺🇸 EE. UU. | `us.json` | SSA (dominio público) | `ssa.gov/oact/babynames/names.zip` — **SSA bloquea curl (403); se descarga abriendo la URL en un navegador real** (ficheros `yobAAAA.txt`, `Nombre,Sexo,Cuenta`) | 2005–2025 | nacimientos 1880–2025 |
| 🇫🇷 Francia | `fr.json` | INSEE | `insee.fr/.../prenoms-2025-nat_csv.zip` (UA de navegador; **UTF-8**; `sexe;prenom;periode;valeur;rang`) | 2005–2025 | nacimientos 1900–2025 |
| 🇬🇧 R. Unido | `uk.json` | ONS (OGL) | `ons.gov.uk/.../babynames1996to2025.xlsx` (openpyxl; Table_1=niñas, Table_2=niños) | 2005–2025 | nacimientos 1996–2025 |
| 🇮🇪 Irlanda | `ie.json` | CSO PxStat | API REST CSV, tablas `VSA50` (niños) / `VSA60` (niñas), estadística `C01`=recuento | 2003–2023 | nacimientos totales |
| 🇳🇴 Noruega | `no.json` | SSB | API JSON-stat, tabla `10467` (POST); **prefijo del código = sexo: 1=niñas, 2=niños** | 2005–2025 | nacimientos 1880–2025 |
| 🇵🇱 Polonia | `pl.json` | dane.gov.pl (Min. Cyfryzacji) | CSV combinado "Imiona nadane w latach 2000-2019" (`Rok,Imię,Liczba,Płeć` M/K) | 2000–2019 | nacimientos 2000–2019 |

## Refrescar / añadir

Los scripts de construcción están en el scratchpad de la sesión (no versionados).
Para refrescar un país: volver a descargar su fichero fuente y regenerar el JSON
con la misma estructura, respetando `y0`/`yN` reales de los datos.

## Pendientes / notas

- **Italia (Istat)**: solo herramienta interactiva, sin descarga masiva. No integrable de forma limpia por ahora.
- **Países Bajos (Meertens)**: dataset riquísimo (**+ significados** de ~20.000 nombres) pero la descarga masiva pide formulario.
- **Alemania**: no hay estadística oficial de nombres (solo la lista semioficial de la GfdS).
- **EVITAR** `philipperemy/name-dataset` (106 países): sus datos provienen de una filtración de Facebook.

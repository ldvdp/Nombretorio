# Analítica de visitas (propia, sin cookies)

Nombretorio cuenta las visitas en su **propio backend** en Vercel, sin cookies y
sin terceros. Guarda solo agregados anónimos: **total**, **visitas por día** y
**país aproximado** (deducido por la red de Vercel a partir de la IP; la IP **no**
se almacena).

- `api/visit.js` — registra una visita. El cliente lo llama **una vez por sesión**
  (marca en `sessionStorage`); el resto de recargas leen con `api/stats`.
- `api/stats.js` — lectura pública, **no incrementa nada**.
- En la web: pulsa el contador **"👁 N visitas"** del pie, o entra directo a
  **`/#stats`** (rangos 1 día / 7 / 15 / 1 mes / 3 meses / 1 año / Todo, gráfico
  por día y desglose por país). La política está en **`/#cookies`**.

## Estado: activo

Almacén **Upstash for Redis** (plan Free) conectado al proyecto desde el
10-07-2026. Inyecta `KV_REST_API_URL` y `KV_REST_API_TOKEN`; el código acepta
también `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.

Comprobación rápida: `curl https://nombretorio.vercel.app/api/stats` debe devolver
`{"configured":true,...}`. Si devuelve `{"configured":false}`, faltan las
variables o el despliegue es anterior a conectarlas (**las variables solo entran
en builds nuevos: hay que redesplegar**).

Claves en Redis, sin tablas que crear:
`nombretorio:visits:total`, `nombretorio:visits:days`, `nombretorio:visits:countries`.

## Notas

- Consumo: ~4 operaciones por visita y ~3 por apertura del panel. El plan Free de
  Upstash da unas 10.000/día, así que sobra de largo.
- Si algún día `/api` fallara o faltara el almacén, el contador del pie
  simplemente se oculta (ya no hay respaldo externo: el contador de terceros
  Abacus se retiró para no llamar a nadie fuera del dominio).
- Al crear el almacén, **no** uses "Redis · Official Redis Cloud" del marketplace:
  es de pago y expone conexión TCP, no la API REST que usa este código.

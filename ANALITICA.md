# Analítica de visitas (propia, sin cookies)

Nombretorio cuenta las visitas en su **propio backend** en Vercel, sin cookies y
sin terceros. Guarda solo agregados anónimos: **total**, **visitas por día** y
**país aproximado** (deducido por la red de Vercel a partir de la IP; la IP **no**
se almacena).

- `api/visit.js` — registra una visita (se llama una vez por sesión desde el footer).
- `api/stats.js` — lectura pública para el panel de estadísticas (no incrementa nada).
- En la web: pulsa el contador **"👁 N visitas"** del pie para abrir el panel
  (rangos 1 día / 7 / 15 / 1 mes / 3 meses / 1 año / Todo + desglose por país).
  El enlace **"Cookies"** del pie abre la política de privacidad.

## Activar el almacén (una sola vez, ~2 min)

Mientras no haya almacén, la web funciona igual y muestra el total con el contador
antiguo (Abacus) como respaldo; el panel avisa de que la analítica detallada está
pendiente. Para activar día/país:

1. Vercel → tu proyecto **Nombretorio** → pestaña **Storage** → **Create Database**.
2. Elige **Upstash for Redis** (plan gratuito / *KV*) y conéctalo al proyecto.
3. Vercel añade solas las variables de entorno. El código acepta cualquiera de
   estos nombres, así que no tienes que tocar nada:
   - `KV_REST_API_URL` + `KV_REST_API_TOKEN`, o
   - `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.
4. **Redeploy** (o haz cualquier push). A partir de ahí se empiezan a registrar
   visitas por día y país.

No hay que crear ninguna tabla: se usan las claves
`nombretorio:visits:total`, `:days` y `:countries`.

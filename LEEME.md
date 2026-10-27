# Worker de Cloudflare para leer tickets

Sirve de intermediario: la clave de Anthropic queda como secreto en Cloudflare y la app solo conoce la
dirección del Worker y un código de acceso. Esta carpeta es aparte de la app (no se sube junto a `index.html`).

## Qué protege y qué no
- La clave real de Anthropic **nunca llega al dispositivo**.
- El código de acceso sí queda guardado en el dispositivo. Si alguien lo saca, solo puede pedir lecturas de tickets
  (el Worker no hace otra cosa), desde tu sitio, con un tope de fotos por día. Se cambia en un minuto.
- Igual conviene poner un límite de gasto mensual en tu cuenta de Anthropic.

## Publicarlo (una sola vez)
Hace falta una cuenta gratuita de Cloudflare y Node.js en tu computadora.

1. Abrí una terminal en esta carpeta y entrá a tu cuenta: `npx wrangler login`
2. Editá `wrangler.toml`: en `ALLOWED_ORIGINS` poné la dirección donde publicás la app, sin barra final
   (por ejemplo `https://tuusuario.github.io`; si tenés más de una, separadas por coma).
3. Cargá los dos secretos (te los pide por pantalla, no quedan en ningún archivo):
   - `npx wrangler secret put ANTHROPIC_API_KEY`  (tu clave `sk-ant-…`)
   - `npx wrangler secret put APP_TOKEN`  (inventá un código largo, de 20 caracteres o más)
4. Publicalo: `npx wrangler deploy`. Al terminar muestra la dirección, algo como
   `https://cuentas-tickets.tuusuario.workers.dev`.
5. En la app: tarjeta "Leer tickets con IA" → pegá esa dirección y el código → Guardar. Repetilo en cada dispositivo.

## Tope diario de fotos (recomendado)
1. `npx wrangler kv namespace create LIMITES` y copiá el `id` que devuelve.
2. En `wrangler.toml` sacá los `#` de las tres líneas `kv_namespaces` y pegá el id.
3. `npx wrangler deploy`. Por defecto el tope es 100 fotos por día; se cambia con la variable `MAX_DAILY`.

## Cambiar el código de acceso
`npx wrangler secret put APP_TOKEN` con el código nuevo, y cargarlo de nuevo en la app de cada dispositivo.

## Si algo falla
- "El Worker rechazó el código": el código de la app no es el de `APP_TOKEN`.
- "El Worker no acepta pedidos desde este sitio": falta tu dirección en `ALLOWED_ORIGINS`.
- "El Worker no pudo usar la clave": revisá `ANTHROPIC_API_KEY` y que la cuenta de Anthropic tenga saldo.

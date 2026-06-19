# Picnic Magazine

E-commerce + sitio editorial para **Picnic**, una revista de arte fino. Trabajo final para la materia Programación Web (ITBA).

**Demo pública:** https://picniczine.vercel.app

---

## Qué hace

- **Catálogo** de ediciones con visualización 3D de cada revista (Three.js).
- **Carrito** persistente en la base (por usuario, no en localStorage).
- **Checkout con Mercado Pago** (Checkout Pro): el server crea la preferencia, el usuario paga en MP y un webhook confirma la compra en la base.
- **Lector PDF embebido** con acceso restringido por compra: las URLs son firmadas y expiran en 1h; sin descarga directa.
- **Modo edición inline** para editores: CRUD de artículos, integrantes, videos y revistas sin salir de la home.
- **Sincronización automática de videos** desde el canal de YouTube (Vercel Cron).
- **Analytics y dashboard** para editores: pageviews, compras, opens de PDF, login/signup.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack), React 19, Tailwind 4 |
| 3D | `@react-three/fiber`, `@react-three/drei`, three.js |
| PDF | `react-pdf` + `pdfjs-dist` (worker desde CDN) |
| Auth + DB + Storage | Supabase (Postgres con RLS, Auth, Storage buckets público/privado) |
| Pagos | Mercado Pago SDK v3 (`mercadopago`) — Checkout Pro |
| Deploy + Cron | Vercel |

Todo en JavaScript, sin TypeScript.

---

## Estructura del repo

```
app/
  api/
    checkout/route.js         # POST: crea preferencia MP a partir del carrito
    webhook/mp/route.js       # POST: recibe notificación MP, valida HMAC, confirma orden
    cron/sync-youtube/route.js  # GET: sincroniza videos del canal (Bearer CRON_SECRET)
  context/
    AuthProvider.jsx          # Sesión Supabase, profile, isEditor / isAdmin
    CartProvider.jsx          # cart_items en DB
    PurchasesProvider.jsx     # purchases + crearOrden() vía RPC
    RevistasProvider.jsx
    ArticulosProvider.jsx
    IntegrantesProvider.jsx
    VideosProvider.jsx
    EditModeProvider.jsx
  components/                 # UI (Header, Revistas, Articulos, Revista3D, etc.)
  leer/[revistaId]/           # Lector PDF (dynamic import ssr:false)
  mis-revistas/               # Biblioteca del usuario
  mis-ordenes/                # Historial de órdenes agrupadas
  pago/{exito,pendiente,error}/  # Páginas de resultado MP
  admin/analytics/            # Dashboard (editor/admin only)
  login, registrarme/         # Auth
  articulos/[slug]/           # Artículos markdown

lib/
  supabase.js                 # cliente browser (PUBLISHABLE_KEY)
  mercadopago.js              # cliente server (ACCESS_TOKEN)
  analytics.js                # trackEvent()
  errorMessages.js            # friendlyCartError()

supabase/migrations/          # SQL idempotente (orden numérico)
  0001_initial_schema.sql
  0002a_enums.sql             # ADD VALUE de enums (separado por limit de Postgres)
  0002_transactions_and_payment_prep.sql
  0003_mercadopago.sql
  0004_revista_contraportada_color.sql
supabase/tests/
  rls_smoke_tests.sql         # Tests adversariales de RLS
```

---

## Setup local

### 1. Clonar e instalar

```bash
git clone git@github.com:Justocel/picnic.git
cd picnic
npm install
```

### 2. Crear `.env.local`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...

# YouTube (cron)
YOUTUBE_API_KEY=...
YOUTUBE_CHANNEL_ID=UC...
CRON_SECRET=<string random largo>

# Mercado Pago (Checkout Pro)
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-...
MP_ACCESS_TOKEN=APP_USR-...
MP_WEBHOOK_SECRET=<clave secreta del webhook en MP>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Las credenciales `_PUBLISHABLE_` / `NEXT_PUBLIC_*` van al bundle del navegador; las `_SECRET_KEY` / `MP_ACCESS_TOKEN` / `MP_WEBHOOK_SECRET` viven sólo en server.

### 3. Aplicar migraciones SQL

En el SQL Editor de Supabase, **en orden y de a una por vez**:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002a_enums.sql`  ← `ADD VALUE` aparte por límite de Postgres (no se puede usar un valor de enum recién creado en la misma transacción)
3. `supabase/migrations/0002_transactions_and_payment_prep.sql`
4. `supabase/migrations/0003_mercadopago.sql`
5. `supabase/migrations/0004_revista_contraportada_color.sql`

Todas son idempotentes — se pueden re-ejecutar sin romper.

### 4. Crear los buckets de Storage

La migración 0001 crea los buckets `imagenes-publicas` (público) y `revistas-pdf` (privado, acceso por purchase). Si no se crearon, hacelo desde el dashboard de Supabase Storage.

### 5. Levantar dev server

```bash
npm run dev
```

Abrir http://localhost:3000.

### 6. Marcarte como editor (para ver modo edición)

Registrate primero con tu mail. Después en el SQL Editor:

```sql
UPDATE profiles SET role = 'editor' WHERE id = (
  SELECT id FROM auth.users WHERE email = 'tu@email.com'
);
```

---

## Arquitectura — puntos clave

### Seguridad

- **Row-Level Security** activa en todas las tablas. Las policies usan `auth.uid()` y `is_editor()` / `is_admin()` (funciones `SECURITY DEFINER` con `SET search_path` para evitar hijack).
- **Triggers de defensa**:
  - `prevent_role_self_escalation`: bloquea que un usuario edite su propio `role`.
  - `snapshot_purchase_price`: pisa `precio_pagado` con el `precio` real de `revistas` (no se puede spoofear desde el cliente).
- **Storage de PDFs**: bucket privado. La policy de SELECT exige que exista una `purchase` en estado `'completada' | 'pagada' | 'confirmada'` para el `revista_id` que corresponde al folder del archivo.
- **JWT del usuario en API routes**: `/api/checkout` recibe el JWT del usuario en el header `Authorization`, crea un cliente Supabase con ese token y llama la RPC — `auth.uid()` se evalúa server-side; el cliente no puede spoofear un user_id.
- **HMAC del webhook MP**: la firma se verifica con SHA-256 sobre `id:<dataId>;request-id:<requestId>;ts:<ts>;` y `MP_WEBHOOK_SECRET`. Si la firma no valida → 401.

### Transacciones atómicas

`crear_orden_completa(p_metodo_pago)` es una stored procedure PL/pgSQL que corre en una transacción implícita: crea las filas en `purchases` y, si el método es `'mock'`, vacía el carrito en el mismo paso. Si algo falla, todo se revierte.

Cuando el método es `'mercadopago'`, las purchases se crean en `estado='pendiente'` y el carrito NO se vacía. El vaciado lo hace `confirmar_pago()` cuando llega el webhook con `status='approved'`.

### Flow de pago real

```
Cliente → POST /api/checkout (JWT)
       └─→ crear_orden_completa('mercadopago')   // purchases en 'pendiente'
       └─→ Mercado Pago: crear preferencia
       └─→ Devuelve init_point
Cliente → redirige a init_point (MP)
       └─→ Usuario paga
Mercado Pago → POST /api/webhook/mp (HMAC)
       └─→ Validar firma
       └─→ Consultar payment a MP (no confiar en el body)
       └─→ confirmar_pago(order_id, payment_id, status)  // purchases a 'pagada' + vacía cart
Mercado Pago → redirige usuario a /pago/exito | /pago/pendiente | /pago/error
```

### UNIQUE parcial en `purchases`

```sql
CREATE UNIQUE INDEX purchases_paid_unique
  ON purchases (user_id, revista_id)
  WHERE estado IN ('completada', 'pagada', 'confirmada');
```

Permite múltiples `'pendiente'` (reintentos de checkout) pero solo una "ownership" real por usuario y revista.

---

## Endpoints API

| Endpoint | Método | Auth | Descripción |
|---|---|---|---|
| `/api/checkout` | POST | Bearer (Supabase JWT) | Crea orden pendiente y preferencia MP, devuelve `init_point` |
| `/api/webhook/mp` | POST | HMAC (`MP_WEBHOOK_SECRET`) | Recibe notificación de pago, confirma orden |
| `/api/cron/sync-youtube` | GET | Bearer (`CRON_SECRET`) | Sincroniza últimos videos del canal |

---

## Deploy

Conectado a Vercel desde `main`. Cada push → deploy automático. PRs generan preview deployments aislados.

**Cron** en `vercel.json`:
```json
{ "crons": [{ "path": "/api/cron/sync-youtube", "schedule": "0 6 * * *" }] }
```

Vercel inyecta `Authorization: Bearer ${CRON_SECRET}` automáticamente.

---

## Testing

- `supabase/tests/rls_smoke_tests.sql` — verifica que `anon` y usuarios sin permisos no pueden leer ni escribir lo que no les corresponde.
- Manual: cuentas TEST de Mercado Pago + tarjetas TEST (`APRO 123456` aprueba, `OTHE` rechaza, `CONT` queda pendiente).
- Review de seguridad pasado: sin `dangerouslySetInnerHTML`, sin `eval`, sin SQL crudo. Open redirect fixeado en `/login` y `/registrarme` con `safeNextPath()`.

---

## Licencia

Proyecto académico — uso educativo.

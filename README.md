# Picnic Magazine

E-commerce + sitio editorial para **Picnic**, una revista de arte fino. Trabajo final para la materia Programación Web (ITBA).

**Demo pública:** https://picniczine.vercel.app
**Repo:** https://github.com/Justocel/picnic

---

## Para evaluadores (lectura rápida)

### Recorrido público (sin login)
1. Abrir `picniczine.vercel.app`.
2. Scrollear la home: **Hero con video de fondo**, **Welcome editorial**, **Artículos**, **Eventos próximos / pasados**, **"Picnic en la escena"** (videos sincronizados desde YouTube por cron), **Conseguí la revista** (escena 3D interactiva con cada edición), **Quiénes Somos** (equipo).
3. **Subheader sticky** con anchors a cada sección, scroll suave. Las secciones vacías se ocultan automáticamente del nav.
4. En el shelf 3D: **drag** sobre una revista para rotarla (vertical y horizontal, sensible al touch); **click** la enfoca con dim del fondo + panel de compra. ESC o click afuera vuelve a la fila. Scroll suave hacia la revista enfocada.
5. Click **Artículos** → leer el artículo de muestra (renderiza markdown).
6. **PWA**: instalable desde el navegador (manifest + íconos).
7. **SEO**: sitemap.xml, robots.txt, Open Graph + Twitter Cards, favicons.

### Recorrido como usuario comprador
1. **Crear cuenta**: botón "Iniciar sesión" → "Registrate". Email + password (mínimo 8). Validación inline. La sesión queda iniciada de inmediato (confirmación de email deshabilitada en esta entrega; la arquitectura lo soporta y es un toggle del dashboard de Supabase).
2. **Iniciar sesión** funciona también con redirect `?next=` sanitizado contra open redirects.
3. **Agregar al carrito** una edición desde el shelf 3D (icono 🛒). El carrito persiste en DB por usuario, no en localStorage.
4. **Ver carrito** (dropdown del header en desktop, modal full-screen en mobile). Editar cantidades / borrar items. Total en vivo.
5. **Pagar con Mercado Pago** (modo TEST):
   - Tarjeta `5031 7557 3453 0604`, CVV `123`, vencimiento `11/30`, titular `APRO 123456`.
   - El webhook server-side valida HMAC, consulta el pago a MP y confirma la compra atómicamente.
   - Páginas de resultado `/pago/exito`, `/pago/pendiente`, `/pago/error`.
6. **Leer la revista**: `/mis-revistas` → "Leer revista" → PDF embebido (`/leer/[revistaId]`) con anti-piracy básico: signed URL con TTL 1h, sin descarga directa, sin print.
7. **Historial**: `/mis-ordenes` con órdenes agrupadas y estados (`pendiente`, `pagada`, `cancelada`).

### Recorrido como editor (modo edición inline)
**Requiere link de invitación** — para no exponer un endpoint público que cualquiera podría usar para hacerse editor, el sistema usa tokens únicos. Si sos el evaluador y querés probar el modo edición, **pediré el link al autor por mail** o por el canal de la materia. Te llega un URL con `?invite=<token>` único y de un solo uso (vence en 7 días).

Una vez logueado como editor:
1. Botón **"Editar"** aparece en el header. Activalo.
2. Inline aparecen controles en cada elemento:
   - **Textos** (Welcome, descripciones de sección, footer): botón ✎ a la derecha → editar inline → guardar en `site_settings`.
   - **Artículos**: agregar (botón "+"), editar (markdown + cover image), reordenar (↑↓), ocultar/mostrar, borrar.
   - **Integrantes**: CRUD + foto.
   - **Videos**: CRUD manual + sincronizados desde YouTube. Asignar sección/orden/visibilidad.
   - **Eventos**: CRUD con fecha, flyer y descripción. Clasifica futuro/pasado solo.
   - **Revistas**: agregar/editar (título, descripción, precio, color de contraportada). Subir portada, contraportada, **PDF** con signed upload (storage policy chequea editor role).
   - **Footer**: editar redes sociales (Instagram, YouTube, etc.) y email de contacto inline.
3. **Dashboard de analytics**: `/admin/analytics` — pageviews, compras, opens de PDF, logins/signups, top páginas y barras diarias.
4. **Invitar más editores**: `/admin/editores` → generar tokens, copiar links, ver pendientes/usados, revocar accesos.

### Qué demuestra este proyecto

| Concepto de la materia | Dónde verlo |
|---|---|
| Maquetado semántico, responsive, accesible | `<section>`, `<article>`, `<nav>`, focus-visible global, `prefers-reduced-motion`, aria-labels en botones interactivos, mobile-first |
| Formularios dinámicos + validación | `app/login`, `app/registrarme`: validación de email regex, password ≥8, trim, mensajes genéricos contra enum attacks |
| Catálogo + API interna | `/api/checkout`, `/api/webhook/mp`, `/api/admin/reconfirm`, `/api/cron/sync-youtube` |
| CRUD + persistencia + admin | Schema relacional con 8 migraciones SQL, RLS estricta, modo edición inline para editores, dashboard de analytics |
| Pagos + webhooks | Mercado Pago Checkout Pro con webhook que acepta IPN clásico Y Webhooks v2, validación HMAC opcional, idempotencia vía stored procedure |
| Transacciones | Stored procedure PL/pgSQL `crear_orden_completa` que crea purchases + vacía carrito atómicamente |
| Seguridad | RLS en todas las tablas, triggers de defensa (`prevent_role_self_escalation`, `snapshot_purchase_price`), JWT del usuario en API routes (no spoofing posible), open redirect fixeado, validación HMAC del webhook, security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) |
| Despliegue | Vercel con CI/CD automático desde main + preview deploys por PR. Cron diario en `vercel.json`. GitHub Actions para lint + tests + build |
| Testing | 27 tests unitarios con Vitest. Smoke tests SQL de RLS contra escalation. |
| Performance | `next/image` para todas las imágenes, lazy-load del shelf 3D, dynamic import del PDF reader (ssr:false), Turbopack |
| Documentación | Este README + `DEMO.md` (guión de defensa) |

---

## Funcionalidades completas

### Frontend público
- **Home single-page** con scroll por secciones y subheader sticky con anchors.
- **Subheader inteligente**: en la home oculta links de secciones que no se montaron en el DOM (eventos sin items visibles, etc). Fuera de la home muestra todos y al click navega a `/#seccion`.
- **Hero** con video de fondo (autoplay muted loop) y overlay.
- **Welcome editorial** con texto editable inline.
- **Artículos**: grid horizontal con scroll, cards con cover, autor, fecha. Link a `/articulos/[slug]` que renderiza markdown.
- **Eventos**: backed por tabla Supabase con CRUD inline en edit mode. Se clasifican automáticamente en "próximos" y "pasados" según `fecha`. Si la sección entera queda sin eventos visibles, desaparece de la home.
- **Picnic en la escena**: videos del canal de YouTube sincronizados automáticamente por cron diario. Editores pueden ocultar/asignar sección/reordenar; el cron preserva esas decisiones.
- **VideoItem**: thumbnail `maxresdefault` → `mqdefault` con fallback en cadena, decodifica entidades HTML en títulos (YouTube los devuelve escapados).
- **Conseguí la revista**: escena 3D con Three.js. Cada revista es un libro con portada/contraportada/lomo. Drag para rotar, click para enfocar (dim de fondo + panel lateral con info y precio). Scroll smooth hacia la revista enfocada. ESC o click afuera vuelve. Drag sensible al touch (divisores diferentes según `pointerType`).
- **Quiénes Somos**: grid de integrantes con foto, nombre, rol.
- **Footer**: redes sociales editables, email de contacto editable, copyright.
- **Mobile UX**: botón de carrito vacío oculto en mobile, drag con sensibilidad ajustada, modal full-screen del carrito.

### Auth & sesión
- **Supabase Auth** con email/password.
- **AuthProvider** expone `session`, `profile`, `isEditor`, `isAdmin`, `signIn`, `signUp`, `signOut`, `loading`.
- **Profile** se crea automáticamente vía trigger `handle_new_user` al registrar.
- **Open redirect protection** con `safeNextPath()` (testeado).
- **Validación cliente** de email + password antes de submit.
- **Mensajes de error friendly** sin filtrar info sensible (no diferencia "user not found" de "wrong password").

### Carrito
- **Persistente en DB** (`cart_items`), no en localStorage. Si te logueás en otro dispositivo, ahí está.
- **CartProvider** expone `cart`, `addToCart`, `removeFromCart`, `updateQuantity`, `clearCart`, `total`, `count`.
- **UI**: dropdown en desktop (header), modal full-screen en mobile.
- **Errores friendly** vía `friendlyCartError()` para constraint violations.

### Compra con Mercado Pago
- **Checkout Pro** (no Bricks): el usuario paga en el dominio de MP, no en el nuestro.
- **POST /api/checkout** con Bearer JWT del usuario → llama RPC `crear_orden_completa('mercadopago')` → crea preferencia con MP → devuelve `init_point`.
- **Webhook /api/webhook/mp**: acepta IPN clásico Y Webhooks v2. Valida HMAC SHA-256 (si `MP_WEBHOOK_SECRET` está seteada). **No confía en el body** — consulta el payment a MP con el `payment_id`. Llama `confirmar_pago()` que actualiza estado + vacía carrito atómicamente. Idempotente.
- **Páginas de resultado**: `/pago/exito` con recarga forzada del estado de purchases (5 intentos × 2s para cubrir delay del webhook), `/pago/pendiente`, `/pago/error`.

### Lector PDF
- **`/leer/[revistaId]`**: dynamic import de `react-pdf` (ssr:false).
- **Signed URL** generada server-side con TTL 1h. La URL no es predecible y no se puede compartir.
- **Storage policy**: bucket `revistas-pdf` privado. La policy de SELECT exige `purchase` en estado `'completada' | 'pagada' | 'confirmada'` para ese `revista_id`.
- **Anti-piracy básico**: sin botón de descarga, sin print directo.
- **Worker**: `pdfjs-dist` desde CDN para no inflar el bundle.

### Modo edición inline (editores)
- **EditModeProvider** con toggle global. Botón "Editar" en header sólo visible si `isEditor`.
- **Site Settings**: tabla `site_settings` (key/value JSON). Cualquier texto del sitio se vuelve editable inline (Welcome, descripciones de sección, redes, copyright, etc.).
- **Artículos**: full CRUD + reordenamiento + visibilidad + cover image (storage `imagenes-publicas`).
- **Integrantes**: full CRUD + reordenamiento + foto.
- **Videos**: full CRUD manual + opción de sync desde YouTube. Asignar sección, orden, visibilidad.
- **Eventos**: full CRUD con fecha (date picker), flyer (upload al bucket público), descripción opcional. La clasificación próximos/pasados es automática según la fecha. Toggle de visibilidad por evento.
- **Revistas**: CRUD + upload de portada/contraportada (imagen) + upload de PDF (signed upload, policy permite a editores).
- **Footer**: redes sociales + email editables inline.
- **Sistema de invitaciones** (`/admin/editores`):
  - Generar token único con TTL 7 días.
  - Copiar link `https://.../registrarme?invite=<token>` al portapapeles.
  - Ver pendientes / usados.
  - Revocar.
  - Trigger `handle_new_user` consume el token y promueve el role al registrar.

### Analytics
- **Tracking client-side** vía `trackEvent()` (lib/analytics.js). Eventos: `page_view`, `login`, `signup`, `add_to_cart`, `purchase_created`, `purchase_confirmed`, `pdf_open`, etc.
- **Tabla `events_analytics`** con RLS: anon puede INSERT, editores pueden SELECT.
- **Dashboard `/admin/analytics`** (server component, editor only):
  - Métricas agregadas por tipo de evento.
  - Top páginas (page_view).
  - Barras de actividad por día.
  - Filtro por rango temporal.

### Sincronización con YouTube
- **`/api/cron/sync-youtube`** (Vercel Cron, daily): fetch al canal vía YouTube Data API v3, upsert en tabla `videos` con `onConflict: 'youtube_id'` que preserva visible/seccion/orden.
- **Decodifica entidades HTML** en títulos/descripciones (YouTube los devuelve escapados).
- **Auth** vía Bearer `CRON_SECRET` que Vercel inyecta automáticamente.

### Seguridad
- **RLS activa en todas las tablas**. Policies usan `auth.uid()` y `is_editor()` / `is_admin()` (funciones `SECURITY DEFINER` con `SET search_path`).
- **Triggers de defensa**:
  - `prevent_role_self_escalation`: bloquea que un usuario edite su propio `role`.
  - `snapshot_purchase_price`: pisa `precio_pagado` con `precio` real de `revistas` al insertar (no se puede spoofear desde cliente).
  - `handle_new_user`: crea profile + consume invitación de editor si aplica.
- **JWT del usuario en API routes**: `/api/checkout` recibe Bearer en `Authorization`, crea cliente Supabase con ese token, llama RPC. `auth.uid()` se evalúa server-side.
- **HMAC del webhook MP**: SHA-256 sobre `id:<dataId>;request-id:<requestId>;ts:<ts>;` con `MP_WEBHOOK_SECRET`. Firma inválida → 401.
- **Security headers** en `next.config.mjs`: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- **Open redirect protection**: `safeNextPath()` en login/registrarme.
- **No `dangerouslySetInnerHTML`, no `eval`, no SQL crudo desde cliente.**
- **Server-only**: `MP_ACCESS_TOKEN`, `SUPABASE_SECRET_KEY`, `MP_WEBHOOK_SECRET`, `CRON_SECRET` nunca llegan al bundle del navegador.

### Transacciones
- **`crear_orden_completa(p_metodo_pago)`**: stored procedure PL/pgSQL. Crea purchases atómicamente y, si el método es `'mock'`, vacía el carrito en la misma transacción.
- **`confirmar_pago(order_id, payment_id, status)`**: idempotente. Marca purchase como `pagada` y vacía carrito. Llamado por el webhook.
- **UNIQUE index parcial**: `purchases_paid_unique ON (user_id, revista_id) WHERE estado IN ('completada','pagada','confirmada')`. Permite múltiples `pendiente` (reintentos) pero solo una ownership real.

### SEO + PWA + accesibilidad
- **Metadata**: Open Graph + Twitter Cards + favicons + apple-touch-icon en `app/layout.js`.
- **Sitemap dinámico** en `app/sitemap.js` (incluye home, artículos, excluye admin/auth).
- **robots.txt** en `app/robots.js` (disallow `/api`, `/admin`, `/leer`, `/mis-*`).
- **PWA manifest** en `app/manifest.js` (instalable).
- **Smooth scroll** global con `html { scroll-behavior: smooth }`.
- **`prefers-reduced-motion`** respetado.
- **focus-visible** custom global.
- **aria-labels** en todos los botones de iconos.
- **Mobile-first** responsive.

### Testing
- **27 tests unitarios** (Vitest) en `app/utils/utils.test.js`:
  - `safeNextPath` (open redirect protection)
  - `isValidEmail`
  - `classifyEvents`
  - `truncateText`
  - `createSlug`
  - `classNames`
  - `extractYoutubeId`
  - `decodeHtmlEntities`
- **RLS smoke tests** en `supabase/tests/rls_smoke_tests.sql`: verifica que anon y usuarios sin permisos no pueden leer ni escribir lo que no les corresponde.
- **CI** en `.github/workflows/ci.yml`: lint + tests + build en cada PR.

### Performance
- **next/image** para todas las imágenes (cover, integrantes, thumbnails YouTube).
- **Dynamic import** de `react-pdf` (ssr:false) y del shelf 3D.
- **Turbopack** para dev + build.
- **Bundle**: PDF worker y three.js cargan on-demand.
- **Reload purchases** con backoff incremental tras pago exitoso.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack), React 19, Tailwind 4 |
| 3D | `@react-three/fiber`, `@react-three/drei`, three.js |
| PDF | `react-pdf` + `pdfjs-dist` (worker desde CDN) |
| Auth + DB + Storage | Supabase (Postgres con RLS, Auth, Storage buckets público/privado) |
| Pagos | Mercado Pago SDK v3 (`mercadopago`) — Checkout Pro |
| Deploy + Cron | Vercel |
| CI | GitHub Actions |
| Tests | Vitest |

Todo en JavaScript, sin TypeScript.

---

## Estructura del repo

```
app/
  api/
    checkout/route.js            # POST: crea preferencia MP a partir del carrito
    webhook/mp/route.js          # POST: recibe notificación MP, valida HMAC, confirma orden
    admin/reconfirm/route.js     # POST: re-confirma una purchase manualmente (admin)
    cron/sync-youtube/route.js   # GET: sincroniza videos del canal (Bearer CRON_SECRET)
  context/
    AuthProvider.jsx             # Sesión Supabase, profile, isEditor / isAdmin
    CartProvider.jsx             # cart_items en DB
    PurchasesProvider.jsx        # purchases + crearOrden() vía RPC
    RevistasProvider.jsx
    ArticulosProvider.jsx
    IntegrantesProvider.jsx
    VideosProvider.jsx
    EventosProvider.jsx
    SiteSettingsProvider.jsx     # textos editables del sitio
    EditModeProvider.jsx         # toggle global del modo edición
  components/                    # UI (Header, Revistas, Articulos, Revista3D, etc.)
  leer/[revistaId]/              # Lector PDF (dynamic import ssr:false)
  mis-revistas/                  # Biblioteca del usuario
  mis-ordenes/                   # Historial de órdenes agrupadas
  pago/{exito,pendiente,error}/  # Páginas de resultado MP
  admin/
    analytics/                   # Dashboard (editor/admin only)
    editores/                    # Generar links de invitación
  login/, registrarme/           # Auth (con safeNextPath y consumo de invite)
  articulos/[slug]/              # Artículos markdown
  utils/
    utils.js                     # helpers + utils.test.js (27 tests)
  sitemap.js, robots.js, manifest.js  # SEO + PWA
  layout.js                      # OG + Twitter + icons + providers
  globals.css

lib/
  supabase.js                    # cliente browser (PUBLISHABLE_KEY)
  mercadopago.js                 # cliente server (ACCESS_TOKEN)
  analytics.js                   # trackEvent()
  errorMessages.js               # friendlyCartError()

supabase/migrations/             # SQL idempotente (orden numérico)
  0001_initial_schema.sql
  0002a_enums.sql                # ADD VALUE de enums (separado por limit de Postgres)
  0002_transactions_and_payment_prep.sql
  0003_mercadopago.sql
  0004_revista_contraportada_color.sql
  0005_editor_invitations.sql
  0006_site_settings.sql
  0007_fix_handle_new_user_order.sql
  0008_eventos.sql
supabase/tests/
  rls_smoke_tests.sql            # Tests adversariales de RLS

.github/workflows/ci.yml         # lint + test + build en cada PR
vercel.json                      # cron config
next.config.mjs                  # security headers + image domains
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

Las credenciales `_PUBLISHABLE_` / `NEXT_PUBLIC_*` van al bundle del navegador; las `_SECRET_KEY` / `MP_ACCESS_TOKEN` / `MP_WEBHOOK_SECRET` / `CRON_SECRET` viven sólo en server.

### 3. Aplicar migraciones SQL

En el SQL Editor de Supabase, **en orden y de a una por vez**:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002a_enums.sql`  ← `ADD VALUE` aparte por límite de Postgres (no se puede usar un valor de enum recién creado en la misma transacción)
3. `supabase/migrations/0002_transactions_and_payment_prep.sql`
4. `supabase/migrations/0003_mercadopago.sql`
5. `supabase/migrations/0004_revista_contraportada_color.sql`
6. `supabase/migrations/0005_editor_invitations.sql`
7. `supabase/migrations/0006_site_settings.sql`
8. `supabase/migrations/0007_fix_handle_new_user_order.sql`
9. `supabase/migrations/0008_eventos.sql`

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

O usá el sistema de invitaciones desde `/admin/editores` (necesitás ser editor primero — bootstraping manual la primera vez).

### 7. Correr tests

```bash
npm test            # Vitest watch mode
npm run test:run    # Single run (CI)
npm run lint        # ESLint
npm run build       # Production build
```

---

## Arquitectura — puntos clave

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
       └─→ /pago/exito recarga purchases con backoff (cubre delay del webhook)
```

### UNIQUE parcial en `purchases`

```sql
CREATE UNIQUE INDEX purchases_paid_unique
  ON purchases (user_id, revista_id)
  WHERE estado IN ('completada', 'pagada', 'confirmada');
```

Permite múltiples `'pendiente'` (reintentos de checkout) pero solo una "ownership" real por usuario y revista.

### Flow de invitación de editor

```
Editor → /admin/editores → POST: genera token (TTL 7d)
       → copia link: /registrarme?invite=<token>
Invitee → /registrarme?invite=<token>
       → signUp con email/password
       → trigger handle_new_user
            ├─→ crea profile
            └─→ consume invitación → UPDATE profile SET role='editor'
       → sesión queda con role editor
```

---

## Endpoints API

| Endpoint | Método | Auth | Descripción |
|---|---|---|---|
| `/api/checkout` | POST | Bearer (Supabase JWT) | Crea orden pendiente y preferencia MP, devuelve `init_point` |
| `/api/webhook/mp` | POST | HMAC (`MP_WEBHOOK_SECRET`) | Recibe notificación de pago, confirma orden |
| `/api/admin/reconfirm` | POST | Bearer + role admin | Re-confirma manualmente una purchase (recovery) |
| `/api/cron/sync-youtube` | GET | Bearer (`CRON_SECRET`) | Sincroniza últimos videos del canal |
| `/api/cron/keep-alive` | GET | Bearer (`CRON_SECRET`) | Query trivial diaria para que Supabase free no pause el proyecto (umbral 7 días) |

---

## Deploy

Conectado a Vercel desde `main`. Cada push → deploy automático. PRs generan preview deployments aislados.

**Cron** en `vercel.json`:
```json
{ "crons": [
  { "path": "/api/cron/sync-youtube", "schedule": "0 6 * * *" },
  { "path": "/api/cron/keep-alive",   "schedule": "0 12 * * *" }
] }
```

Vercel inyecta `Authorization: Bearer ${CRON_SECRET}` automáticamente.

**CI** en GitHub Actions corre lint + tests + build en cada PR contra main.

---

## Testing

- **`app/utils/utils.test.js`** — 27 tests unitarios (Vitest) cubriendo helpers críticos.
- **`supabase/tests/rls_smoke_tests.sql`** — verifica que `anon` y usuarios sin permisos no pueden leer ni escribir lo que no les corresponde.
- **Manual**: cuentas TEST de Mercado Pago + tarjetas TEST (`APRO 123456` aprueba, `OTHE` rechaza, `CONT` queda pendiente).
- **Review de seguridad pasado**: sin `dangerouslySetInnerHTML`, sin `eval`, sin SQL crudo. Open redirect fixeado en `/login` y `/registrarme` con `safeNextPath()`.

---

## Licencia

Proyecto académico — uso educativo.

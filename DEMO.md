# Guión de defensa — Picnic Magazine

Plan sugerido para la presentación oral (~10-15 min) y respuestas a las preguntas que probablemente te hagan.

---

## 1. Apertura (1 min)

> "Picnic es una revista de arte fino. La consigna fue armar un e-commerce editorial: catálogo, lectura digital con anti-piratería básica, pago real y un CMS para que los editores actualicen el contenido sin tocar código. Está deployado en `picniczine.vercel.app` y todo el código está en `github.com/Justocel/picnic`."

Mostrar: la home en `picniczine.vercel.app`.

---

## 2. Recorrido funcional (4-5 min)

Hacé el recorrido EN VIVO en este orden, comentando lo que pasa:

### 2.1. Navegación pública
1. **Hero + secciones**: scrolleá por la home. Articulos, Eventos, Picnic en la escena (videos), Revistas, Integrantes.
2. **Auto-ocultas vacías**: mencioná que cualquier sección sin contenido visible se oculta del DOM. Si querés demostrarlo, en `Editar` ocultá todos los integrantes y mostrá cómo desaparece la sección.
3. **Revista 3D**: hover sobre el libro 3D, mostrá que rota. Si está mergeado el PR de Stripe Press, mostrá el drag-y-vuelve-solo.

### 2.2. Registro y login
4. Click en "Iniciar sesión" o "Crear cuenta". Mostrá que valida email y que después de loguearte ves "Mis revistas" en el header.

### 2.3. Compra real
5. Agregá una revista al carrito → "Pagar con Mercado Pago".
6. **Tarjeta TEST**: `5031 7557 3453 0604` / CVV `123` / Venc `11/30` / Titular `APRO 123456`.
7. Mostrá la pantalla de éxito. Volvé a `/mis-revistas` y abrí "Leer revista" → el PDF se renderiza embebido, no se puede descargar (mostrar que click derecho no hace nada).

### 2.4. Modo edición
8. Logueado como editor, mostrá el botón "Editar" del header. Activalo.
9. Cambiá inline el título de un artículo, ocultá/mostrá un integrante, agregá una nueva revista (sin pdf por ahora — explicá que el PDF se sube DESPUÉS de crear porque la RLS de storage exige el UUID).
10. Mostrá `/admin/analytics`: gráficos básicos con eventos reales.

---

## 3. Arquitectura (3-4 min)

Diapositiva o pizarra con este flujo, mostrando 3 piezas:

### 3.1. Stack

> "Next.js 16 App Router del lado del cliente y server (los API routes son funciones serverless en Vercel). Supabase como base relacional con Postgres, Auth y Storage. Mercado Pago para los pagos. Tres.js para el 3D del catálogo."

### 3.2. Seguridad — RLS y triggers

Abrir [supabase/migrations/0001_initial_schema.sql](supabase/migrations/0001_initial_schema.sql) y mostrar:

- **Row Level Security activada en todas las tablas**. Los `policy ... USING (auth.uid() = user_id OR is_editor())` impiden que un usuario lea o escriba lo que no le corresponde.
- **`is_editor()` es `SECURITY DEFINER` con `SET search_path = public`** para evitar hijack del search_path.
- **`prevent_role_self_escalation`** trigger: bloquea que cualquiera se haga editor desde el cliente.
- **`snapshot_purchase_price`** trigger: el `precio_pagado` de cada `purchase` lo pisa el server con el precio real de `revistas`, no se puede spoofear desde el cliente.

### 3.3. Transacciones atómicas

Abrir [supabase/migrations/0003_mercadopago.sql](supabase/migrations/0003_mercadopago.sql) y mostrar `crear_orden_completa()` y `confirmar_pago()`. Decir:

> "La creación de la orden es una stored procedure que corre en una transacción implícita. Si cualquier parte falla — carrito vacío, revista inactiva, constraint violation — Postgres revierte todo. No puede pasar que se haya cobrado pero no se haya creado la purchase, ni viceversa."

### 3.4. Flow de pago con webhook

Dibujar el flow del README:

```
Cliente → /api/checkout (con JWT) → RPC crear_orden_completa('mercadopago')
       → preference de MP → init_point → MP
                                    ↓
                          MP recibe el pago
                                    ↓
        MP → POST /api/webhook/mp (HMAC) → confirmar_pago() → DB
```

Puntos a destacar:
- **El JWT del usuario va en el header `Authorization`**: el server crea un cliente Supabase con ese token, así `auth.uid()` se resuelve server-side. El cliente no puede pretender ser otro user.
- **El webhook valida HMAC SHA-256** sobre `id:<dataId>;request-id:<requestId>;ts:<ts>;` con el secreto que MP me dio. Si la firma no valida, devuelvo 401.
- **No confío en el body del webhook**: cuando llega la notificación, consulto el payment directamente al SDK de MP con el `payment_id` para obtener el `status` real. Si alguien intentara spoofear el body, no le sirve.

### 3.5. UNIQUE parcial — el detalle fino

> "Tuve que cambiar el constraint de `purchases` de UNIQUE pleno a UNIQUE parcial sobre los estados pagados, porque al integrar MP necesito permitir múltiples intentos pendientes por usuario/revista — pero sin permitir que tengas dos compras 'pagadas' de la misma edición."

```sql
CREATE UNIQUE INDEX purchases_paid_unique
  ON purchases (user_id, revista_id)
  WHERE estado IN ('completada', 'pagada', 'confirmada');
```

---

## 4. Lo que no funcionó / decisiones de scope (1-2 min)

Honestidad. Mostrá que entendés trade-offs:

- **No hay suscripción recurrente**: Mercado Pago lo soporta (`Preapproval`) pero scope-out. La estructura del schema lo permite si alguna vez quieren sumarlo.
- **Cron 1x/día** (no 2x): tier gratis de Vercel Cron solo permite un disparo diario, y los videos no cambian tanto.
- **Roles `editor` y `admin`** ya están en el enum, pero la UI todavía no distingue (admin tiene acceso a TODO). Cuando se sume "gestión de pagos sensible", se separa.
- **Coverflow de Stripe Press**: intentado, revertido en el primer intento por overengineering, segunda iteración en el PR #2. Lección: cambios visuales grandes, uno por uno.

---

## 5. Preguntas probables y cómo contestarlas

### ¿Por qué Supabase y no algo más vanilla?

> "Quería evitar reinventar Auth y RLS. Supabase me dio Postgres directo (yo escribo SQL plano, no un ORM) + Auth con JWT + Storage con policies. Si en el futuro hace falta migrar a otra DB, el SQL es portable salvo `auth.uid()`, que es la única atadura."

### ¿Por qué stored procedures y no toda la lógica en Next?

> "Atomicidad. Si la creación de purchases + vaciado de carrito están en dos llamadas separadas desde Next, no son atómicas — si el segundo falla, queda inconsistencia. Una RPC corre en una transacción PG y revierte todo si algo sale mal. Además, ejecuto con `SECURITY DEFINER` y valido `auth.uid()` adentro: el cliente no puede pasar `user_id` arbitrario."

### ¿Qué pasa si el webhook de MP nunca llega?

> "La purchase queda en `estado='pendiente'`. La RLS del bucket de PDFs no la habilita, así que el user paga pero no puede leer. Como mitigación, MP reintenta el webhook varias veces. Para producción real agregaría un job que periódicamente le pregunte al SDK de MP por payments pendientes y los confirme."

### ¿Por qué el cliente Supabase del navegador y el del server son distintos?

> "El del browser usa la `PUBLISHABLE_KEY` (anon), que es la que respeta RLS. El del server usa la `SECRET_KEY` (service role), que bypassea RLS. La service role solo aparece en API routes server-side; nunca toca el bundle del cliente."

### ¿Cómo evitás que se descargue el PDF?

> "Defensa en capas, no infalible pero adecuada para una revista: (a) bucket privado, sólo signed URLs con TTL de 1h; (b) policy de storage que exige `purchase` con estado de ownership; (c) en el cliente bloqueo click derecho y uso `react-pdf` que renderiza a `<canvas>`, no a `<embed>`. Un usuario determinado podría screen-capture, eso es inevitable; el objetivo era frenar al casual."

### ¿Tests?

> "Hay tests adversariales de RLS en `supabase/tests/rls_smoke_tests.sql` — corren contra la DB con un user anónimo y un user random, y verifican que ninguno puede leer ni escribir lo que no le corresponde. No tengo test suite de UI; para un proyecto de este tamaño, los tests SQL me dieron más confianza que tests de componentes."

### ¿Por qué hiciste un PR si workás solo?

> "Para que Vercel genere preview deploys aislados. En `main` el flujo es push-y-deploy automático. Para cambios visuales arriesgados, abro PR, miro el preview, y mergeo solo si está bien — así nunca rompo la producción."

---

## 6. Cierre (30 seg)

> "El proyecto cubre todos los entregables del programa — repo público, deploy con CI/CD y preview, landing responsive y accesible, formularios validados, catálogo + API interna, CRUD persistente con admin funcional, y checkout real con webhook firmado. Estoy listo para preguntas."

---

## Checklist pre-defensa

- [ ] Tener `picniczine.vercel.app` cargado y logueado como editor en una ventana.
- [ ] Tener otra ventana incógnita lista para el flow de compra (usuario TEST de MP).
- [ ] Tener el SQL Editor de Supabase abierto en otra pestaña por si te piden ver una tabla.
- [ ] Tener los archivos de migración SQL abiertos en el editor (para mostrar el código si te lo piden).
- [ ] Saber dónde está cada cosa en el código: `app/api/`, `app/context/`, `supabase/migrations/`, `lib/mercadopago.js`.
- [ ] Tener el README abierto en GitHub por si te piden la documentación.
- [ ] Cargar `$50000` saldo TEST en MP por si querés mostrar con saldo en lugar de tarjeta.
- [ ] Tener listas las credenciales del comprador TEST (email + password).

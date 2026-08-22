# PRD: Sistema Web de Kardex e Inventario Multiempresa

> **Versión:** 2.0 · **Fecha:** Junio 2026 · **Estado:** Borrador para revisión

| Campo | Detalle |
|---|---|
| **Elaborado por** | Equipo de Producto |
| **Método de valorización** | Promedio Ponderado Móvil |
| **Plataforma** | React 19 + Hono + PostgreSQL + GCP |

---

## Tabla de Contenidos

1. [Objetivo y Alcance](#1-objetivo-y-alcance)
2. [Público Objetivo](#2-público-objetivo)
3. [Restricciones Tecnológicas](#3-restricciones-tecnológicas)
4. [Arquitectura Multiempresa](#4-arquitectura-multiempresa)
5. [Modelo de Datos](#5-modelo-de-datos-entidades-principales)
6. [Método de Valorización del Kardex](#6-método-de-valorización-del-kardex)
7. [Módulos del Sistema](#7-módulos-del-sistema)
8. [Matriz de Permisos por Rol](#8-matriz-de-permisos-por-rol)
9. [Requerimientos Funcionales](#9-requerimientos-funcionales)
10. [Requerimientos No Funcionales](#10-requerimientos-no-funcionales)
11. [Roadmap del MVP](#11-roadmap-del-mvp)
12. [Integraciones y Dependencias Externas](#12-integraciones-y-dependencias-externas)
13. [Glosario](#13-glosario)

---

## 1. Objetivo y Alcance

Desarrollar una plataforma web SaaS multiempresa para la gestión de inventarios mediante Kardex valorizado con el método de Promedio Ponderado Móvil. El sistema proporcionará trazabilidad completa de productos, control de movimientos de almacén, gestión granular de usuarios por empresa y generación de reportes exportables.

**Fuera del alcance de este MVP:**

- Integración con sistemas ERP externos (SAP, Oracle).
- Facturación electrónica o integración tributaria.
- Aplicación móvil nativa (iOS / Android).
- Módulo de punto de venta (POS).

---

## 2. Público Objetivo

### 2.1 Tipos de empresa

El sistema está diseñado para negocios con necesidad de control de stock: tiendas comerciales, minimarkets, ferreterías, distribuidoras y negocios minoristas en general.

### 2.2 Perfiles de usuario

| Rol | Denominación interna | Responsabilidad principal |
|---|---|---|
| Administrador | `ADMIN` | Configuración global, gestión de usuarios y empresa, acceso total |
| Supervisor | `SUPERVISOR` | Aprobación de ajustes sensibles, acceso a reportes y Kardex |
| Almacenero | `WAREHOUSE` | Registro de entradas, salidas y devoluciones; sin acceso a reportes financieros |

---

## 3. Restricciones Tecnológicas

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend | React 19 + Vite + TypeScript | Responsive Design; soporte Chrome, Firefox, Edge (últimas 2 versiones) |
| Backend | Node.js + Hono + TypeScript | API REST; JWT para autenticación; BCrypt para contraseñas |
| Base de datos | PostgreSQL 15+ | Estrategia multiempresa: esquema único con columna `company_id` |
| Infraestructura | Google Cloud Platform | Cloud Run (backend), Cloud SQL (BD), Cloud Storage (archivos) |
| Contenedores | Docker + Docker Compose | Entornos de desarrollo y staging |
| CI/CD | GitHub Actions | Deploy automático a staging en merge a `main` |

---

## 4. Arquitectura Multiempresa

### 4.1 Estrategia de aislamiento

Se adoptará el modelo de base de datos compartida con columna discriminadora (`company_id` en todas las tablas de dominio). Esta estrategia balancea costo de infraestructura con aislamiento de datos.

| Estrategia | Costo infra | Aislamiento | Decisión |
|---|---|---|---|
| BD por empresa | Alto | Máximo | ❌ Descartada: inviable para MVP con múltiples clientes |
| Schema por empresa | Medio | Alto | ❌ Descartada: complejidad de migraciones alta |
| **Columna `company_id`** | Bajo | Medio | ✅ **Seleccionada:** escalable, migraciones simples, suficiente para MVP |

### 4.2 Reglas de aislamiento

- Todo query de dominio (productos, movimientos, Kardex) **DEBE** incluir `WHERE company_id = :cid`.
- El `company_id` del token JWT es la única fuente de verdad; nunca se acepta del body del request.
- Los índices de BD incluirán `company_id` como primera columna compuesta para optimizar consultas.
- Las migraciones incluirán validación de integridad referencial cruzando `company_id`.

---

## 5. Modelo de Datos (Entidades Principales)

El diseño completo (ERD) debe elaborarse como artefacto separado antes de iniciar la Fase 2.

| Entidad | Campos clave | Relaciones |
|---|---|---|
| `companies` | `id, name, ruc, address, logo_url, is_active, created_at` | Raíz del tenant |
| `users` | `id, company_id, name, email, password_hash, role, is_active` | Pertenece a `company` |
| `categories` | `id, company_id, name, description` | Tiene muchos `products` |
| `suppliers` | `id, company_id, name, ruc, phone, email, address` | Referenciado en `movements` |
| `warehouses` | `id, company_id, name, location, is_active` | Tiene muchos `stock_balances` |
| `products` | `id, company_id, category_id, code, name, unit_of_measure, min_stock, is_active` | Tiene `stock_balances` y `movements` |
| `stock_balances` | `id, product_id, warehouse_id, company_id, quantity, avg_cost, updated_at` | Una fila por `producto + almacén` |
| `inventory_movements` | `id, company_id, product_id, warehouse_id, type, quantity, unit_cost, total_cost, reference, approved_by, created_by, created_at` | Fuente del Kardex |
| `kardex_entries` | `id, movement_id, product_id, company_id, date, in_qty, in_cost, out_qty, out_cost, balance_qty, balance_cost, avg_cost` | Vista materializada del Kardex |
| `audit_logs` | `id, company_id, user_id, action, entity, entity_id, old_value, new_value, ip, created_at` | Inmutable |

### 5.1 Unidades de Medida

El campo `unit_of_measure` es obligatorio en `products` y acepta valores controlados:

| Código | Descripción |
|---|---|
| `UND` | Unidad |
| `KG` | Kilogramo |
| `LT` | Litro |
| `MT` | Metro |
| `CJA` | Caja |
| `PAQ` | Paquete |

---

## 6. Método de Valorización del Kardex

### 6.1 Promedio Ponderado Móvil

El sistema utilizará exclusivamente el **Promedio Ponderado Móvil**. Este método recalcula el costo promedio después de cada entrada.

### 6.2 Fórmulas

| Concepto | Fórmula |
|---|---|
| Nuevo costo promedio | `(Stock anterior × Costo promedio anterior + Cantidad entrada × Costo unitario entrada) / (Stock anterior + Cantidad entrada)` |
| Costo de salida | `Cantidad salida × Costo promedio vigente` |
| Valor inventario | `Cantidad en stock × Costo promedio actual` |

### 6.3 Reglas de negocio del Kardex

- No se permite registrar salidas si el stock disponible es menor a la cantidad solicitada.
- Toda operación genera automáticamente una entrada en `kardex_entries`.
- El costo promedio se recalcula inmediatamente en cada entrada (tiempo real, no por lote).
- Las devoluciones de ventas incrementan stock al costo promedio **vigente** al momento de la devolución.
- Las devoluciones de compras reducen stock al costo de la **compra original** (requiere referencia al movimiento de entrada).
- Los ajustes negativos no pueden dejar el stock en negativo.
- Los ajustes positivos utilizan el costo unitario ingresado manualmente por usuario autorizado.

---

## 7. Módulos del Sistema

### 7.1 Autenticación y Gestión de Usuarios

- Registro de usuarios (solo el `ADMIN` de la empresa puede crear nuevos usuarios).
- Inicio de sesión con email y contraseña; token JWT con expiración de **8 horas**.
- Refresh token para sesiones activas (expiración **7 días**).
- Recuperación de contraseña por email: token de un solo uso, expira en **30 minutos**; requiere integración SMTP/SendGrid.
- Gestión de roles: `ADMIN`, `SUPERVISOR`, `WAREHOUSE` (ver matriz en sección 8).
- Perfil de usuario: cambio de nombre, foto de perfil y contraseña.
- Bloqueo de cuenta tras **5 intentos fallidos** consecutivos (desbloqueo manual por `ADMIN`).

### 7.2 Gestión de Empresas

- Crear empresa: razón social, RUC, dirección, logo, moneda operativa y zona horaria.
- Editar y desactivar empresa (borrado lógico para preservar auditoría).
- Un usuario pertenece a una sola empresa (modelo simplificado para MVP).

### 7.3 Gestión de Almacenes

> Módulo nuevo, requerido para soportar transferencias entre almacenes.

- CRUD de almacenes (nombre, ubicación, descripción, estado activo/inactivo).
- Cada empresa tiene al menos un almacén **Principal** creado por defecto al registrarse.
- El stock se gestiona por `producto + almacén` (tabla `stock_balances`).

### 7.4 Gestión de Productos

- CRUD con campos: código interno, nombre, descripción, categoría, proveedor predeterminado, unidad de medida, stock mínimo, precio de venta referencial, imagen.
- Código interno único por empresa.
- Búsqueda por nombre, código y categoría; filtros por estado y stock bajo mínimo.
- Un producto no puede eliminarse si tiene movimientos registrados (baja lógica).

### 7.5 Gestión de Categorías y Proveedores

- CRUD de categorías: nombre y descripción.
- CRUD de proveedores: nombre, RUC, teléfono, email, dirección, estado.
- Categorías y proveedores con movimientos asociados solo admiten baja lógica.

### 7.6 Movimientos de Inventario

Todos los movimientos pasan por un pipeline unificado que actualiza `stock_balances` y genera `kardex_entries` en una **transacción atómica**.

| Tipo | Subtipo | Efecto stock | Campos requeridos |
|---|---|---|---|
| Entrada | Compra | `+Cantidad` | Proveedor, almacén, producto, cantidad, costo unitario, fecha, N° orden compra (opcional) |
| Entrada | Dev. venta | `+Cantidad` | Referencia al movimiento de venta original, almacén, cantidad |
| Entrada | Ajuste positivo | `+Cantidad` | Motivo, almacén, producto, cantidad, costo unitario, aprobación `SUPERVISOR` |
| Salida | Venta | `-Cantidad` | Cliente (texto libre), almacén, producto, cantidad, precio venta referencial |
| Salida | Dev. compra | `-Cantidad` | Referencia al movimiento de compra original, almacén, cantidad |
| Salida | Ajuste negativo | `-Cantidad` | Motivo, almacén, producto, cantidad, aprobación `SUPERVISOR` |
| Transferencia | Traslado | Sin cambio neto | Almacén origen, almacén destino, producto, cantidad; genera 2 movimientos internos |

**Flujo de aprobación para ajustes:**

1. El `WAREHOUSE` crea el ajuste en estado `PENDIENTE`.
2. El `SUPERVISOR` o `ADMIN` lo aprueba o rechaza con comentario.
3. Solo los ajustes `APROBADOS` actualizan el stock y generan entrada en Kardex.

### 7.7 Kardex por Producto

- Vista cronológica de todos los movimientos de un producto en un almacén dado.
- Columnas: fecha, tipo, referencia, entrada (qty / costo unit / total), salida (qty / costo unit / total), saldo (qty / costo promedio / valor total).
- Filtros: rango de fechas, almacén, tipo de movimiento.
- Solo lectura; los movimientos no pueden editarse, solo anularse mediante contraasiento.

### 7.8 Dashboard

- Métricas: total de productos activos, SKUs bajo stock mínimo, valor total del inventario.
- Gráfico de línea: evolución del valor del inventario (últimos 30 días).
- Gráfico de barras: top 10 productos con mayor movimiento (últimos 7 días).
- Tabla de movimientos recientes (últimas 10 operaciones con acceso al detalle).
- Alertas de stock mínimo visibles en dashboard y listado de alertas (no email en MVP).

### 7.9 Reportes

| Reporte | Descripción | Exportación |
|---|---|---|
| Kardex por producto | Movimientos con saldos y costos promedio para un producto y rango de fechas | PDF, Excel |
| Inventario valorizado | Stock actual con costo promedio y valor total por producto | PDF, Excel |
| Movimientos por período | Entradas y salidas filtrables por tipo, almacén y fecha | PDF, Excel |
| Productos bajo stock mínimo | Productos cuyo stock actual es menor al mínimo configurado | PDF, Excel |

Todos los PDFs incluyen: logo de la empresa, razón social, RUC, rango de fechas y pie de página con fecha de generación y usuario.

### 7.10 Auditoría

- Registro automático de toda acción CRUD sobre entidades principales.
- Campos: usuario, acción, entidad, valor anterior, valor nuevo, IP, timestamp UTC.
- Acceso restringido a `ADMIN`.
- Retención mínima de 12 meses. Los registros son inmutables (`DELETE` no permitido).

---

## 8. Matriz de Permisos por Rol

| Funcionalidad | ADMIN | SUPERVISOR | WAREHOUSE |
|---|:---:|:---:|:---:|
| Gestionar usuarios | ✅ | ❌ | ❌ |
| Gestionar empresa | ✅ | ❌ | ❌ |
| CRUD productos / categorías / proveedores | ✅ | ✅ | ❌ |
| Registrar entradas y salidas | ✅ | ✅ | ✅ |
| Aprobar ajustes de inventario | ✅ | ✅ | ❌ |
| Ver Kardex | ✅ | ✅ | Solo su almacén |
| Anular movimientos | ✅ | ✅ | ❌ |
| Generar / exportar reportes | ✅ | ✅ | ❌ |
| Ver Dashboard | ✅ | ✅ | Solo métricas básicas |
| Ver Auditoría | ✅ | ❌ | ❌ |

---

## 9. Requerimientos Funcionales

Cada RF incluye criterios de aceptación en formato **Dado / Cuando / Entonces**.

| ID | Nombre | Criterios de aceptación |
|---|---|---|
| RF-01 | Registro de usuario | **Dado** un `ADMIN` autenticado / **Cuando** crea usuario con email único, nombre, rol y contraseña temporal / **Entonces** el usuario queda activo y recibe email con su contraseña |
| RF-02 | Inicio de sesión | **Dado** un usuario activo / **Cuando** ingresa email y contraseña correctos / **Entonces** recibe JWT (8h) y refresh token (7d) |
| RF-03 | Recuperación de contraseña | **Dado** un email registrado / **Cuando** solicita reset / **Entonces** recibe link válido por 30 min; al usarlo la contraseña se actualiza y el link se invalida |
| RF-04 | Gestión de roles | **Dado** `ADMIN` / **Cuando** cambia el rol de un usuario / **Entonces** los nuevos permisos aplican en el siguiente inicio de sesión y el cambio queda en auditoría |
| RF-05 | Registrar empresa | **Dado** superadmin de plataforma / **Cuando** registra empresa con RUC único, razón social y moneda / **Entonces** empresa queda activa con almacén "Principal" creado automáticamente |
| RF-06 | CRUD productos | **Dado** `ADMIN` o `SUPERVISOR` / **Cuando** crea producto con código único, nombre, categoría y unidad de medida / **Entonces** el producto queda disponible para movimientos |
| RF-07 | CRUD categorías | **Dado** `ADMIN` o `SUPERVISOR` / **Cuando** crea una categoría / **Entonces** puede asignarse a productos; no se puede eliminar si tiene productos activos |
| RF-08 | CRUD proveedores | **Dado** `ADMIN` o `SUPERVISOR` / **Cuando** registra proveedor con RUC único por empresa / **Entonces** queda disponible para compras; baja lógica si tiene movimientos |
| RF-09 | Registrar entrada | **Dado** usuario con permiso / **Cuando** registra compra con proveedor, producto, cantidad y costo / **Entonces** stock incrementa, costo promedio recalcula y Kardex se actualiza en la misma transacción |
| RF-10 | Registrar salida | **Dado** usuario con permiso / **Cuando** registra venta con cantidad ≤ stock disponible / **Entonces** stock decrece al costo promedio vigente y Kardex se actualiza |
| RF-11 | Ajuste de inventario | **Dado** `WAREHOUSE` / **Cuando** registra ajuste / **Entonces** queda en estado `PENDIENTE`; **Dado** `SUPERVISOR` o `ADMIN` / **Cuando** aprueba / **Entonces** stock y Kardex se actualizan |
| RF-12 | Transferencia entre almacenes | **Dado** usuario con permiso / **Cuando** registra traslado de producto X, cantidad Y, de almacén A a B / **Entonces** stock A decrece y stock B incrementa al mismo costo promedio |
| RF-13 | Consultar Kardex | **Dado** usuario autorizado / **Cuando** filtra por producto, almacén y fechas / **Entonces** ve tabla con entradas, salidas, saldos y costos promedio en orden cronológico |
| RF-14 | Alerta stock mínimo | **Dado** cualquier movimiento de salida / **Cuando** el stock resultante es menor al `min_stock` del producto / **Entonces** se genera alerta visible en dashboard y listado de alertas |
| RF-15 | Dashboard | **Dado** usuario autenticado / **Cuando** accede al dashboard / **Entonces** ve métricas actualizadas (máximo 30s de caché) sin necesidad de recargar la página |
| RF-16 | Generar reporte | **Dado** `ADMIN` o `SUPERVISOR` / **Cuando** solicita reporte con filtros / **Entonces** en menos de 10s recibe PDF o Excel con encabezado corporativo y datos correctos |
| RF-17 | Auditoría | **Dado** cualquier acción CRUD sobre entidades críticas / **Cuando** se ejecuta / **Entonces** `audit_log` registra usuario, acción, entidad, valores anterior/nuevo, IP y timestamp UTC |

---

## 10. Requerimientos No Funcionales

| ID | Categoría | Especificación |
|---|---|---|
| RNF-01 | Rendimiento | Tiempo de respuesta API < 1s para consultas simples; < 3s para reportes con hasta 10,000 movimientos |
| RNF-02 | Disponibilidad | 99% de uptime mensual (~7.2h caída/mes). Ventana de mantenimiento: domingos 02:00–04:00 UTC. RPO: 1h. RTO: 4h |
| RNF-03 | Seguridad – Auth | BCrypt (cost ≥ 12). JWT firmado con RS256. Refresh token rotativo. Bloqueo tras 5 intentos fallidos |
| RNF-04 | Seguridad – Datos | HTTPS obligatorio (TLS 1.2+). BD cifrada en reposo. `company_id` validado en cada request. UUIDs en lugar de IDs secuenciales en la API |
| RNF-05 | Escalabilidad | Backend stateless para escala horizontal. Pool de conexiones BD: 200 conexiones concurrentes en MVP |
| RNF-06 | Backup | Snapshot diario automático (Cloud SQL), retención 30 días. Backup semanal en bucket separado, retención 6 meses |
| RNF-07 | Usabilidad | UI responsive desde 768px de ancho. Compatible WCAG 2.1 nivel AA en vistas principales |
| RNF-08 | Internacionalización | Separador decimal configurable (punto o coma). Formato de fecha configurable (DD/MM/YYYY por defecto). Moneda y zona horaria configurables por empresa. Timestamps internos siempre en UTC |
| RNF-09 | Auditabilidad | `audit_logs` inmutables. Retención mínima 12 meses. Acceso exclusivo para `ADMIN`. `DELETE` no permitido sobre la tabla |

---

## 11. Roadmap del MVP

| Fase | Estimado | Módulos | Criterio de salida |
|---|---|---|---|
| **1** | 3–4 semanas | Autenticación, gestión de usuarios, gestión de empresa, gestión de almacenes | Usuario puede autenticarse, crear empresa con almacén default y gestionar usuarios con roles |
| **2** | 3–4 semanas | Productos, categorías, proveedores, unidades de medida | Catálogo completo con búsqueda, filtros y baja lógica funcional |
| **3** | 4–5 semanas | Entradas, salidas, devoluciones, ajustes (con flujo de aprobación), transferencias, Kardex | Pipeline de movimientos funcional; Kardex refleja todos los movimientos con costos correctos |
| **4** | 2–3 semanas | Dashboard, reportes (PDF y Excel), alertas de stock mínimo | Reportes exportables con encabezado corporativo; dashboard con datos en tiempo real |
| **5** | 2–3 semanas | Auditoría, pruebas de carga, configuración de producción en GCP, CI/CD | Sistema en producción; prueba de carga ≥ 50 usuarios concurrentes sin degradación |

> **Total estimado:** 14–19 semanas. Asume equipo de 1 frontend + 1 backend + 1 QA parcial.

---

## 12. Integraciones y Dependencias Externas

| Servicio | Propósito | Notas |
|---|---|---|
| SendGrid / SMTP | Envío de emails (reset de contraseña, bienvenida) | Configurar en Fase 1. Credenciales vía variables de entorno; nunca en código |
| Cloud SQL (PostgreSQL) | Base de datos principal | Instancia `db-standard-2` en MVP. Escalado vertical planificado en Fase 5 |
| Cloud Run | Backend Hono en contenedores | Mín. instancias: 1 (evitar cold start en prod). Máx.: 10 en MVP |
| Cloud Storage | Logos de empresa, imágenes de producto | Bucket privado. URLs firmadas con TTL de 1 hora para acceso del frontend |
| GitHub Actions | CI/CD | `lint → tests → build → deploy staging` en merge a `main`; deploy a prod manual con aprobación |

---

## 13. Glosario

| Término | Definición |
|---|---|
| **Kardex valorizado** | Registro cronológico de movimientos de inventario que incluye cantidades y valores monetarios con costo promedio actualizado en cada transacción |
| **Promedio Ponderado Móvil** | Método de valorización que recalcula el costo promedio de un producto después de cada entrada, ponderando el stock anterior con el nuevo lote recibido |
| **Multiempresa (SaaS)** | Arquitectura donde múltiples empresas comparten la misma instancia del software, con aislamiento lógico de datos por `company_id` |
| **Stock mínimo** | Umbral configurado por producto que, al ser alcanzado o superado a la baja, genera una alerta en el sistema |
| **Baja lógica** | Desactivación de un registro (`is_active = false`) en lugar de eliminación física, para preservar la integridad de auditoría e historial |
| **Contraasiento** | Movimiento de anulación que revierte el efecto de un movimiento previo sobre el stock y el Kardex, manteniendo el registro original como evidencia |
| **RPO** | *Recovery Point Objective:* máximo tiempo de datos que se acepta perder en caso de falla (1 hora en este PRD) |
| **RTO** | *Recovery Time Objective:* tiempo máximo para restaurar el servicio tras una falla (4 horas en este PRD) |

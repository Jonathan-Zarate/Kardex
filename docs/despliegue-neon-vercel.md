# Despliegue en Neon y Vercel

## 1. Neon

1. Crear un proyecto PostgreSQL y una rama de staging.
2. Copiar la cadena **pooled** con SSL como `DATABASE_URL`.
3. Ejecutar primero los scripts de `database/preflight/`.
4. Si todos los contadores son cero, ejecutar:

   ```bash
   pnpm --filter @kardex/database db:migrate
   ```

5. Cargar la semilla indicando contraseñas exclusivas del entorno mediante las
   tres variables `SEED_*_PASSWORD`.

No ejecutar migraciones automáticamente durante cada arranque serverless.

## 2. Backend en Vercel

Importar este repositorio como un proyecto nuevo:

- Root Directory: `backend`
- Framework Preset: Hono
- Node.js: 22.x
- Include source files outside of the Root Directory: activado, porque
  `@kardex/database` es un paquete del workspace.

Variables:

- `DATABASE_URL`: conexión pooled de Neon con SSL.
- `JWT_ACCESS_SECRET`: valor aleatorio de al menos 32 caracteres.
- `APP_URL`: dominio del frontend; admite varios orígenes separados por coma.
- `EMAIL_FROM` y configuración SMTP cuando se habilite correo real.

Verificación:

- `GET /health/live` prueba que la función responde.
- `GET /health/ready` prueba que PostgreSQL está disponible.

## 3. Frontend en Vercel

Importar el mismo repositorio como otro proyecto:

- Root Directory: `frontend`
- Framework Preset: Vite
- Build Command: `pnpm build`
- Output Directory: `dist`

Variable:

- `VITE_API_URL`: dominio público del backend, sin `/api` ni slash final.

Después del primer despliegue, copiar el dominio definitivo del frontend a
`APP_URL` del backend y volver a desplegar la API.

## 4. Validación posterior

1. Consultar ambos health checks.
2. Iniciar sesión con cada rol.
3. Verificar un acceso permitido y uno denegado por rol.
4. Crear entrada, salida, transferencia y devolución parcial.
5. Ejecutar dos salidas simultáneas contra el mismo stock.
6. Revisar logs de Vercel y conexiones de Neon.

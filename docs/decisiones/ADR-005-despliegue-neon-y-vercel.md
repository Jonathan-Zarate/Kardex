# ADR-005: Despliegue con Neon y Vercel

- Estado: aceptada
- Fecha: 2026-08-22

## Contexto

El repositorio contiene configuración para Docker, Cloud Run, Cloud SQL y GCP,
pero la decisión actual es usar Neon PostgreSQL y desplegar frontend y backend
en Vercel. La API también inicia siempre un servidor en el puerto 3000, lo cual
no corresponde al ciclo de vida serverless.

## Decisión

1. Mantener el monorepo y crear dos proyectos Vercel conectados al mismo repo:
   uno con raíz `frontend` y otro con raíz `backend`.
2. Exportar la aplicación Hono desde `backend/src/app.ts`; Vercel la detectará
   como aplicación backend y Node local usará una entrada separada.
3. El frontend consumirá `VITE_API_URL` en producción y conservará `/api` con
   proxy únicamente para desarrollo local.
4. `APP_URL` aceptará una lista explícita de orígenes separados por coma. No se
   permitirá un comodín con credenciales.
5. Separar salud de proceso (`/health/live`) y disponibilidad de PostgreSQL
   (`/health/ready`).
6. GitHub Actions validará instalación, pruebas, tipos, lint y build. Los
   despliegues los realizará la integración Git de Vercel; se retira el flujo
   obsoleto de GCP.
7. Neon usará conexión con SSL y pool para el runtime serverless. Las migraciones
   se ejecutarán como paso explícito, nunca durante cada arranque de la API.

## Variables requeridas

### Backend

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `APP_URL`
- `EMAIL_FROM` y proveedor SMTP cuando se habilite correo real

### Frontend

- `VITE_API_URL`

## Consecuencias

- Frontend y backend tendrán dominios independientes.
- Los previews requieren registrar explícitamente su origen o usar un dominio
  estable de staging.
- Los procesos programados no deben ejecutarse con temporizadores dentro de la
  función serverless; requerirán Vercel Cron o un servicio externo.

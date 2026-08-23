# ADR-004: Autorización vigente desde la base de datos

- Estado: aceptada para implementación
- Fecha: 2026-08-22

## Contexto

El middleware actual confía en `role` y `companyId` incluidos en un JWT con ocho
horas de vigencia. Si un administrador desactiva una cuenta, cambia su rol o
desactiva la empresa, los permisos anteriores continúan válidos hasta que el
token expire.

## Decisión

1. El access token se usará únicamente para identificar al usuario mediante
   `sub` y controlar expiración.
2. En cada solicitud autenticada se consultará el usuario y su empresa.
3. El contexto autorizado se construirá con `companyId`, `role` y `email`
   vigentes en PostgreSQL, nunca con claims proporcionados por el token.
4. Usuarios inactivos, bloqueados, inexistentes o pertenecientes a una empresa
   inactiva recibirán `401` de inmediato.
5. `requireRole` seguirá siendo la política de acceso por rol, pero consumirá el
   contexto actualizado por el middleware.

## Consecuencias

- Revocaciones y cambios de rol tienen efecto inmediato.
- Cada solicitud autenticada añade una lectura indexada por la clave primaria
  del usuario.
- Más adelante puede añadirse una caché de muy corta duración con invalidación,
  pero no se sacrificará la revocación inmediata sin medir primero.

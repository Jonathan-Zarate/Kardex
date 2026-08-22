# Checkpoint 001: linea base y secretos de los seeds

**Fecha:** 22 de agosto de 2026  
**Estado:** completado localmente, pendiente de publicacion

## Pedido a Codex

Analizar el proyecto con los criterios aprendidos en Qbox, recuperar la trazabilidad Git y preparar el repositorio para continuar con cambios incrementales.

## Hallazgo

El repositorio remoto estaba vacio y el codigo local incluia tres contraseñas de demostracion escritas directamente en el seed de usuarios. Publicar primero la linea base y eliminarlas despues habria conservado esos valores en el historial de Git.

## Decision de Jonathan

Continuar con los cambios antes de publicar el repositorio.

## Correccion aplicada

- Las contraseñas ya no tienen valores predeterminados en el codigo.
- El comando de seed exige tres variables locales.
- Cada contraseña debe tener al menos 12 caracteres.
- `.env` permanece ignorado y `.env.example` solo declara nombres sin valores.
- El commit raiz se enmienda antes del primer push para evitar que los valores anteriores lleguen al historial publico.

## Validacion esperada

```powershell
rg -n "passwordHash: await hash\\('" database/src/seeds
```

No debe devolver coincidencias.

```powershell
cd database
.\node_modules\.bin\tsc.CMD --noEmit -p tsconfig.json
```

Debe finalizar con codigo 0.

## Criterio humano aplicado

No se acepto la alternativa de borrar los secretos en un segundo commit porque Git conserva el contenido anterior. Como el commit inicial aun no habia sido publicado, se eligio sanear y enmendar la linea base antes del primer push.

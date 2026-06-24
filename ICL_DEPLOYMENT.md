# Despliegue de sincronización ICL

La sincronización se ejecuta en Vercel, no en la computadora del usuario ni
desde PostgreSQL.

## 1. Aplicar la migración

```powershell
npm.cmd run supabase:push:secure
```

La migración `20260625060000_client_icl_import_and_disable_http_cron.sql`:

- elimina el cron PostgreSQL que no puede conectarse al BCRA;
- crea la RPC segura `importar_indices_icl`;
- permite importar lotes únicamente a usuarios admin/superadmin o service role.

## 2. Variables privadas de Vercel

En Vercel: Project > Settings > Environment Variables, cargar para Production:

```text
SUPABASE_URL=https://sxxmhuaapqueejohsemv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service_role_del_proyecto
CRON_SECRET=una_cadena_aleatoria_de_al_menos_16_caracteres
```

No agregar `VITE_` a esas variables. De ese modo no se incorporan al código
del navegador.

## 3. Desplegar

Al desplegar el proyecto, Vercel detecta:

- `api/sync-icl.ts`: función serverless;
- `vercel.json`: cron diario a las 06:15 UTC.

El CTA está disponible en:

`Configuración > Índice ICL > Actualizar ICL desde BCRA`

## Seguridad

- El CTA envía el access token del usuario autenticado.
- La función comprueba en `user_profiles` que sea admin o superadmin.
- La service role sólo existe como variable privada del servidor.
- El cron se autentica mediante `CRON_SECRET`.
- Las fechas son únicas y los ajustes también son únicos por contrato/fecha.

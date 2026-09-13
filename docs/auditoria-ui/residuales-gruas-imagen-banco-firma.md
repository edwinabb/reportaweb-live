# Residual — GRUAS: `imagen_banco` / `imagen_firma` sin fuente en Bubble

**Fecha de verificación:** 2026-09-09
**Tabla:** `cotizaciones_configuracion` (PROD, `fqwhagryqkkhbgznxtwf`)
**Tenant:** GRUAS DEL PACÍFICO (`6f4c923a-c3b7-47c2-9dea-2a187f274f73`)

## Verificación directa contra Bubble (API Live)

Se consultó el registro real de `cotizaciones_configuracion` de GRUAS en Bubble LIVE
(`https://reporta.la/api/1.1/obj/cotizaciones_configuracion/1693455680001x159750058880938620`,
tipo confirmado en minúsculas `cotizaciones_configuracion`) y también por `constraints` sobre
`tenant_id` para confirmar que es la única fila del tenant (`count: 1`).

El JSON completo devuelto (11 campos) **no incluye `imagen_banco` ni `imagen_firma`** — Bubble
omite del response los campos vacíos, así que su ausencia confirma que esos archivos **nunca se
subieron** para GRUAS. El registro fue creado el `2023-08-31T04:21:20.002Z` y modificado por
última vez apenas 1 minuto después (`2023-08-31T04:22:14.252Z`) — nunca se volvió a tocar.

Como referencia, el mismo registro de CISE (`1596739476957x373529478922312450`) sí trae ambos
campos poblados (`imagen_banco` modificado tan reciente como 2025-11-21), lo que confirma que la
ausencia en GRUAS es real y no un problema de la consulta.

**Conclusión: no hay nada que migrar.** No existe una fuente recuperable en Bubble para GRUAS — es
necesario pedirle el archivo directo al cliente (banco/firma del gerente general, mismo tipo de
archivo JPG/PNG que ya se recuperó para CISE).

## Limpieza de las URLs rotas en Supabase (autorizada por el usuario, 2026-09-09)

Antes de esta verificación, las 2 columnas en Supabase PROD no estaban en `NULL` — tenían URLs
heredadas apuntando al proyecto Supabase viejo/muerto (`wioozisskjjgjjybsoqo.supabase.co`, DNS ya
no resuelve):

```
imagen_banco = https://wioozisskjjgjjybsoqo.supabase.co/storage/v1/object/public/cotizaciones/tenant_6f4c923a/banco/banco_2026-05-23.png
imagen_firma = https://wioozisskjjgjjybsoqo.supabase.co/storage/v1/object/public/cotizaciones/tenant_6f4c923a/firma/firma_unknown_2026-05-23.jpg
```

Esto significaba que la UI de configuración de cotizaciones de GRUAS intentaba cargar una imagen
que da 404 (dominio muerto), en vez de mostrar un estado vacío. El usuario autorizó explícitamente
limpiar ambas columnas mientras se consigue el archivo real:

```sql
UPDATE cotizaciones_configuracion
SET imagen_banco = NULL, imagen_firma = NULL
WHERE tenant_id = '6f4c923a-c3b7-47c2-9dea-2a187f274f73';
```

Ejecutado contra PROD, verificado con `RETURNING` — ambas columnas confirmadas en `NULL`. Se
verificó también contra TEST (`oyrokyyaeaeqzlsgxtto`): no existe fila de `cotizaciones_configuracion`
para el `tenant_id` de GRUAS en ese proyecto, así que no requirió ningún cambio ahí.

## Pendiente real

Pedirle a GRUAS (canal a elección del usuario — email/WhatsApp/reunión):
1. Logo/imagen del banco que usan para mostrar datos de depósito en las cotizaciones.
2. Imagen de la firma que va en el PDF de cotización (firma del gerente general o quien
   corresponda).

Cuando el cliente entregue los archivos, subirlos siguiendo el mismo patrón ya usado para CISE
(bucket `cotizaciones`, path `tenant_6f4c923a/banco/...` y `tenant_6f4c923a/firma/...`), y
actualizar las 2 columnas con la URL real del proyecto correcto (`fqwhagryqkkhbgznxtwf`).

## Confirmación en Bubble (2026-09-13)

Verificado en vivo en `reporta.la` → Opciones Internas → Empresas Interno → GRUAS → tab
"6. Formato de cotización": los campos "imagen con la información de las cuentas bancarias" y
"Firma Autorizada" muestran el placeholder vacío (captura
`screenshots/14-opciones-internas/07-empresa-tab6-formato-cotizacion.png`). **GRUAS nunca cargó
esos archivos en Bubble**, así que no hay nada que recuperar: el pedido a GRUAS pasa de "recuperar"
a "cargar por primera vez", y solo importa si GRUAS va a usar Cotizaciones en v3 (hoy 1 cotización
en 2025, 0 en 2026).

# Escalar auditoría UI v1.2 a los módulos restantes — Plan

> **Para quien retome esto:** este plan reemplaza la frase "módulos 5-15" del checklist de
> `2026-09-08-recorrido-completo-fases-1-9.md` — esa cifra estaba basada en el número de archivo
> `0N-*.md`, no en el roadmap real de 15 módulos. Ver "Corrección de alcance" abajo.

## Corrección de alcance (2026-09-09)

El roadmap original de 15 módulos está en `docs/auditoria-ui/RETRO-PILOTO-2026-07-14.md` (retro
del piloto Usuarios, 2026-07-14). El orden de ejecución real **no siguió** ese roadmap 1:1 — se
reordenó sobre la marcha según prioridad de negocio. Confirmado por archivo existente en
`docs/auditoria-ui/`:

| Archivo | Módulo auditado | Estado |
|---|---|---|
| `01-usuarios.md` | Usuarios | 🟢 Cerrado (piloto, 2026-07-14) |
| `02-maquinaria.md` | Maquinaria | 🟢 Cerrado |
| `03-terceros.md` | Terceros (incluye Sitios como sub-módulo) | 🟢 Cerrado — gaps de datos abiertos documentados (código/tipo/dirección de Sitios), no bloquean el cierre del módulo |
| `04-planificacion.md` | Planificación | 🟢 Cerrado (TK-P1 cerrado 2026-09-08) |
| `05-configuracion.md` | Configuración | 🟢 Cerrado |
| `06-cotizaciones.md` | Cotizaciones | 🟢 Cerrado — TK-C1/TK-C4 en backlog de UI, no bloquean |
| `07-informes.md` | Informes | 🟢 Cerrado (TK-I1 cerrado 2026-09-08) |
| `08-epp.md` | Gestión EPP | 🟢 **Cerrado 2026-09-09** — gap crítico de datos encontrado y resuelto (módulo construido sin fase de migración, GRUAS tenía 0 filas migradas en 3 tipos Bubble; migrados 16 catálogo + 4 entregas + 14 items desde Bubble producción). TK-E1/E2/E3 en backlog de UI, no bloquean. |

**8 de 15 módulos del roadmap original ya están auditados** (aunque el archivo `03-terceros.md`
ya cubrió "Sitios", que en el roadmap original era un módulo aparte — se folded correctamente, no
hace falta re-auditarlo).

**Quedan 6 módulos genuinamente sin auditar:**

| # roadmap original | Módulo | Archivo a crear |
|---|---|---|
| 8 | Gestión Formatos | `09-formatos.md` |
| 10 | Planes de Acción | `10-planes-accion.md` |
| 11 | Ventas | `11-ventas.md` |
| 12 | Compras | `12-compras.md` |
| 14 | Perfil de Usuario | `13-perfil-usuario.md` |
| 15 | Opciones Internas | `14-opciones-internas.md` |

(Numeración de archivo continua desde `07-informes.md` → `08` en adelante, no reutiliza los
números del roadmap original para evitar colisión con los ya usados.)

**Nota sobre las "6 ambigüedades" del piloto "Cargos":** el checklist origen menciona un piloto
posterior ("Cargos", corrido dentro de Configuración) que encontró 6 ambigüedades del checklist v1
+ 1 implementación huérfana/duplicada eliminada, con instrucción explícita de "no re-ejecutar el
piloto, iterar sobre lo ya encontrado". Esa conversación específica **no quedó documentada en
ningún archivo del repo** — vivió solo en el chat del 2026-09-08, que ya no está disponible en esta
sesión. No se inventan esas 6 ambigüedades acá. En su lugar, la sección siguiente (v2 del
checklist) extrae reglas **evidenciadas de forma consistente** en los 7 módulos ya cerrados —
cualquiera de esas 6 ambigüedades originales que el usuario recuerde debería agregarse a esta v2
cuando aparezca.

---

## Checklist de auditoría exhaustiva v2

Reglas explícitas para resolver los patrones que aparecieron repetidamente al auditar los 7
módulos ya cerrados, cada una con un ejemplo real de dónde se aplicó.

### Regla 1 — Filtro avanzado de Bubble vs. filtro embudo por columna de reportaweb3

Cuando Bubble expone un botón "Filtrar" (panel de filtros avanzados) y reportaweb3 lo resuelve con
**filtros embudo por columna** (`<ColumnFilterHeader>`, una opción por columna tipificada — NO
ordenamiento/sort), se cuenta como ✅ equivalente, no como gap, salvo que el panel de Bubble tenga
un filtro real que ninguna columna de reportaweb3 pueda replicar (ej. rango de fechas combinado con
2 campos a la vez). Confirmar el caso puntual, no asumir equivalencia automática si el panel de
Bubble es notablemente más rico.

**Corrección 2026-09-09 (el usuario corrigió la redacción original de esta regla):** el mecanismo
correcto es **filtro embudo por columna**, no "columnas ordenables". `docs/UI-TEMPLATE-LISTADOS.md`
ya lo decía bien desde el principio (regla 3 "sin ordenamiento por columna" + regla 4 "filtros por
columna en columnas tipificadas") — la interpretación errónea fue de esta sesión al auditar
Cotizaciones, no una inconsistencia real del estándar. **Ya corregido en código**: el listado de
Cotizaciones (`components/cotizaciones/cotizaciones-columns.tsx`) tenía `DataTableColumnHeader`
(sort) en todas sus columnas y ningún embudo — se reemplazó por `ColumnFilterHeader` en
`estado`/`servicio`/`proveedor` (columnas tipificadas) y títulos fijos sin sort en el resto, mismo
patrón que `app/(dashboard)/maquinarias/columns.tsx`. *Precedente:* DUDA-COT-001
(`06-cotizaciones.md`) resuelto ✅ equivalente; fix real aplicado el 2026-09-09.

### Regla 2 — Implementación huérfana/duplicada

Si al auditar una pantalla aparecen 2 implementaciones del mismo listado/formulario (una enlazada
desde el menú, otra accesible por URL directa pero sin link visible): la NO enlazada se marca para
**eliminar**, no para arreglar — nunca mantener 2 versiones vivas de la misma pantalla.
*Precedente:* `job_titles`/Cargos, `2026-09-08-recorrido-completo-fases-1-9.md:141-143` (dentro de
`/settings/users`, implementación real vs. `/settings/users/job-titles` huérfana).

### Regla 3 — Mejora deliberada vs. gap real

Una diferencia de comportamiento entre Bubble y reportaweb3 se clasifica como "mejora deliberada"
(⚪, no bloquea) solo si (a) endurece integridad de datos o UX de forma justificable, Y (b) el
usuario confirma explícitamente que quiere mantenerla — nunca asumir que un endurecimiento es
bienvenido sin preguntar. Se documenta como DUDA hasta tener esa confirmación, después pasa a ⚪.
*Precedente:* DUDA-COT-002 (bloqueo de edición sobre cotizaciones APROBADA/RECHAZADA) — el usuario
confirmó mantenerlo, recién ahí se cerró como ⚪.

### Regla 4 — Toggle Activos/Papelera cuando Bubble no tiene el concepto

Bubble en general no tiene soft-delete — cuando reportaweb3 lo agrega (estándar v1.2), es una
mejora del sistema nuevo, se marca ✅ directamente, no requiere DUDA ni comparación 1:1.
*Precedente:* aplicado igual en Usuarios, Maquinaria, Cotizaciones.

### Regla 5 — Umbral de cobertura de datos (✅ / 🟡 / 🔴)

Sobre un campo de datos migrado (no de UI):
- **✅** — ≥95% de cobertura, o el resto tiene una explicación de negocio real y no-bloqueante (ej.
  "cotizaciones nunca enviadas al cliente no tienen `pdf_url`", eso es esperado, no un gap).
- **🟡** — 80-95% de cobertura sin explicación de negocio clara, o una discrepancia entre lo
  documentado en el plan de migración y lo encontrado en producción que requiere investigar (no
  bloqueante por sí sola, pero merece su propio documento de residual, como se hizo en las Tareas
  5-8 del `2026-09-09-resolucion-pendientes-recorrido-1-9.md`).
- **🔴** — <80%, o 0% cuando Bubble sí tenía el dato — gap crítico, ticket con severidad ALTA.
*Precedente:* `03-terceros.md` Sitios (código 0,4% → 🔴 crítico) vs. `06-cotizaciones.md` `pdf_url`
88% → ✅ (resto explicado).

### Regla 6 — Sesión de Bubble con tiempo limitado

Si la sesión de exploración en Bubble se corta antes de verificar un flujo completo (ej. wizard
secuencial que no se puede saltar sin datos reales), NO bloquea el cierre del módulo — se
documenta explícitamente qué quedó "confirmado por código y datos, no verificado interactivamente
en vivo" y se marca ✅ con esa salvedad, no como DUDA abierta.
*Precedente:* `06-cotizaciones.md` paso 2 del wizard (Matriz de Responsabilidad) — confirmado por
código/datos, no interactivamente, cerrado igual.

### Regla 7 — Cierre de un módulo requiere 0 DUDAs sin resolución escrita

Antes de marcar un módulo `🟢 CERRADO`, la tabla de DUDAs del documento no puede tener ninguna fila
sin una "Resolución" completada — no alcanza con "pendiente de decidir después".
*Precedente:* ya exigido explícitamente en el cierre de `06-cotizaciones.md`.

---

## Restricción de ejecución — acceso a Bubble en vivo

Cada módulo de este roadmap necesita, como mínimo, una sesión real en Bubble (`reporta.la`, tenant
GRÚAS, usuario `edwinb@reporta.la`) para comparar UI 1:1 — el lado de datos (conteos, schema) ya se
puede verificar sin eso, vía `mcp__claude_ai_Supabase__execute_sql` y la API Data de Bubble
(`BUBBLE_API_TOKEN`/`BUBBLE_API_URL` en `.env.local`, ya usados en toda la migración). Esta sesión
no tiene credenciales de navegador para Bubble — dos formas de resolverlo por módulo:

1. **El usuario navega Bubble y pasa screenshots** (mismo patrón usado en los 7 módulos ya
   cerrados, guardados en `c:/tmp/screenshots/reportar/[N] [modulo]/`) — más lento pero no requiere
   compartir credenciales.
2. **El usuario comparte credenciales de Bubble** para que esta sesión use `mcp__playwright__*`
   (ya disponible) y navegue Bubble en vivo, tomando sus propias capturas — más rápido, evita
   round-trips, pero es una decisión de seguridad del usuario (compartir su sesión de Bubble).

No se asume ninguna de las 2 — se pregunta al usuario al arrancar el primer módulo (EPP).

---

## Roadmap de ejecución — 6 módulos restantes

Cada módulo es su propia sesión (mismo criterio que el roadmap original: ~6h por módulo,
2/semana). Orden propuesto por impacto de negocio (Planes de Acción es operativo diario;
Perfil de Usuario y Opciones Internas son los de menor riesgo, van al final):

1. **Planes de Acción** (`10-planes-accion.md`) — ya tiene Panel+Listado en reportaweb3, falta
   comparar contra Bubble. **Verificar primero si tiene historial de commits de "migración" antes
   de asumir que ya tiene datos** (lección de EPP: una feature nueva puede tener UI completa y 0
   datos migrados).
2. **Ventas** (`11-ventas.md`) — ya tiene Panel/Valoraciones/Facturas en reportaweb3.
3. **Compras** (`12-compras.md`) — mismo patrón que Ventas, probablemente comparten componentes.
4. **Gestión Formatos** (`09-formatos.md`) — DUDA D-02 de `00-sidebar.md` sigue abierta (¿visible
   para tenant o solo admin?) — resolverla es parte de este módulo.
5. **Perfil de Usuario** (`13-perfil-usuario.md`) — bajo riesgo, ya reorganizado fuera del sidebar.
6. **Opciones Internas** (`14-opciones-internas.md`) — solo `reporta_admin`, bajo riesgo.
   **Alcance corregido por el usuario (2026-09-09):** este módulo no se audita solo contra
   `/sistema` de reportaweb3 — parte de "Opciones Internas" de Bubble migró a una app externa
   separada, `reporta-admin` (`C:\Proyectos\reporta-admin`, deploy `admin.reporta.la`, rol
   `reporta_admin`, ver `docs/superpowers/plans/2026-09-06-reporta-admin.md`). La auditoría de este
   módulo cubre **ambos**: lo que sigue viviendo en `/sistema` de reportaweb3 (solo visible para
   `reporta_admin`) + lo que ahora vive en `reporta-admin` — comparando cada uno contra su
   equivalente real en Bubble, no asumir que todo mapea a un solo lado.

## Plantilla por módulo (mismo formato que `06-cotizaciones.md`, ya validado)

Cada `NN-modulo.md` nuevo sigue esta estructura, copiada de los 7 ya cerrados:

1. **Cabecera:** fecha, módulo N/15, tenant Bubble auditado, fuente de datos (Supabase MCP,
   fecha), fuente de UI (dev local o PROD).
2. **Resumen Ejecutivo:** 2-4 líneas, % de paridad, gap principal si lo hay.
3. **Por cada sub-página:** tabla Bubble↔reportaweb3 con regla de exhaustividad (TODAS las
   opciones de la página: filtros, exportar, menú de fila, bulk actions — no solo lo principal,
   per `feedback_auditoria_exhaustiva_bubble.md`), tabla de cobertura de datos (Regla 5 de la v2).
4. **Gaps y tickets:** tabla con ID / Severidad / Descripción / Acción.
5. **DUDAs:** tabla con ID / Pregunta / Resolución (vacío hasta que el usuario responda).
6. **Cierre:** solo cuando la Regla 7 se cumple (0 DUDAs sin resolución).

## Actualizar al cerrar cada módulo

- `docs/auditoria-ui/00-sidebar.md` — tildar el módulo en la tabla de mapeo.
- Este plan — mover el módulo de "Roadmap de ejecución" a una tabla de "Cerrados", igual que se
  hizo arriba con los 7 ya existentes.
- Si el módulo revela un gap de **datos** (no solo de UI), abrir un documento de residual
  independiente (mismo patrón que `docs/auditoria-ui/residuales-*.md` de esta sesión) en vez de
  mezclarlo dentro del documento de auditoría UI.

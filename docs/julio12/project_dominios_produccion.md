---
name: Dominios producción Reporta
description: Cuál dominio corresponde al sistema viejo y cuál al nuevo — crítico para no tocar prod equivocado
type: project
---

**reporta.la** = sistema VIEJO (Bubble/anterior) — usuarios reales activos. NO tocar, NO deployar ahí.

**reporta.app** = sistema NUEVO (reportaweb3, Next.js) — este es el sistema en desarrollo/producción nueva.

**Why:** El usuario lo aclaró explícitamente tras un deploy que mencionó `app.reporta.la` como URL de producción. Los usuarios reales están en `reporta.la` y cualquier confusión podría afectarlos.

**How to apply:** Al hacer releases de reportaweb3, la URL de producción correcta es `reporta.app`. Nunca mencionar `reporta.la` como destino de deploy de reportaweb3.

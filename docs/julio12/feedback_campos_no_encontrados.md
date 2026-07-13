---
name: Campos no encontrados — pendientes en archivo
description: Cuando no se encuentra un campo (fotos, PDFs, archivos), no asumir — documentar como pendiente
type: feedback
---

Cuando un campo de foto, PDF o archivo no se encuentra o su valor es inesperado (ej: "Rows with URL: 0"), NO asumir la causa ni continuar con esa hipótesis.

**Why:** El usuario prefiere que los casos no resueltos queden documentados en un archivo de pendientes para revisarlos juntos al final, en lugar de que Claude adivine o haga cambios basados en suposiciones incorrectas.

**How to apply:**
- Crear o actualizar `docs/pendientes_por_resolver.md` con el caso
- Formato: tabla con campo, tabla, problema observado, evidencia
- Continuar con los demás puntos del plan
- Al final de la sesión, revisar el archivo con el usuario

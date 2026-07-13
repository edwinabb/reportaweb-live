# EB-release — bump de versión, commit, push y deploy a Vercel

Incrementa la versión patch del proyecto (x.y.z → x.y.z+1), hace commit + push, y despliega la versión de desarrollo a Vercel.

## Pasos

1. Lee `package.json` y calcula la siguiente versión patch.
2. Actualiza `package.json` → nuevo número de versión.
3. Actualiza `CLAUDE.md`:
   - Línea de versión en la tabla del ecosistema (columna Versión, fila Web admin).
   - Tabla de fases: marca con `✅ vX.Y.Z` toda fase cuyo código ya esté en el working tree (busca los archivos clave de cada fase para confirmarlo). Deja `⏳` las que aún no tienen implementación.
4. Revisa `DEUDA_TECNICA.md`:
   - Mueve a la tabla "Resuelta" cualquier DT activa que tenga fix ya aplicado en los archivos del working tree.
   - Agrega o actualiza la entrada de las fases completadas en esta versión (con fecha y versión).
   - Si quedan fases pendientes sin DT activo que las cubra, agrega o actualiza el DT correspondiente (ej. DT-005).
5. Actualiza la memoria persistente en `C:\Users\Usuario\.claude\projects\c--Proyectos-reportaweb3\memory\`:
   - Crea un nuevo archivo `project_ejecucion_avance_YYYY-MM-DD.md` con:
     - Fases completadas en esta versión: archivos clave creados/modificados y qué hace cada uno.
     - Fases pendientes (Oleada siguiente): qué fases son, en qué orden, cuáles van en paralelo.
   - Agrega una línea al índice `MEMORY.md` apuntando al nuevo archivo.
6. Muestra el resumen de cambios (archivos modificados + nueva versión) y pide confirmación antes de continuar.
7. Hace `git add` de los archivos modificados relevantes (NO usar `git add .` — excluir `.env*`, `*.json` de auth, archivos de build).
8. Commit con formato:
   ```
   feat(vX.Y.Z): <descripción breve de los cambios principales>

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
   ```
9. `git push origin master`.
10. Despliega la versión de desarrollo a Vercel ejecutando `vercel` (sin `--prod`).
    - URL de desarrollo: <https://reportaweb3.vercel.app/>
    - Si `vercel` no está disponible en PATH, indicar al usuario que ejecute `npx vercel` manualmente.
11. Reporta el resultado: versión publicada, URL del deploy generado por Vercel, y si el deploy fue exitoso o necesita intervención manual.

# EB-types — Regenerar tipos Supabase

Regenera `types/supabase.ts` desde el schema actual del proyecto Supabase.

## Pasos

1. Ejecuta:
   ```
   npx supabase gen types typescript --project-id wioozisskjjgjjybsoqo > types/supabase.ts 2>/dev/null
   ```
2. Verifica que el archivo resultante empieza con `export type Json = ...`.
3. Si hay errores de compilación TypeScript relacionados con los tipos nuevos, repórtalos con el archivo y línea exactos.
4. Hace `git add types/supabase.ts` pero NO commitea — deja al usuario decidir cuándo incluirlo en el commit.
5. Reporta cuántas tablas/tipos nuevos aparecen respecto al archivo anterior.

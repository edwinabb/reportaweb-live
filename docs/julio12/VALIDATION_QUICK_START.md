---
name: validation-quick-start
description: Pasos inmediatos para validar que BD está completa y lista
metadata: 
  node_type: memory
  type: project
  status: ready
  created: 2026-07-12
  project_url: https://fqwhagryqkkhbgznxtwf.supabase.co
  originSessionId: 6dd09602-6056-44d1-b8a1-3e5e3112f772
---

# ⚡ Validación Rápida — BD Recuperada (30-60 min)

**Proyecto:** fqwhagryqkkhbgznxtwf (Brasil, Producción)  
**Status:** 🟢 ACTIVE  
**Objetivo:** Validar que todo está intacto antes de cutover

---

## PASO 1: Conectar App (10 min)

```bash
# Terminal 1: Inicia app
cd C:\Proyectos\reportaweb3
npm run dev

# Terminal 2: Espera a que compile
# Cuando veas: "Ready in X seconds"
```

Ve a **http://localhost:3000/login**

### Validaciones:

- [ ] ✅ Página de login carga sin errores
- [ ] ✅ Puedes logearte como e2e-planner@reporta.la (test user)
- [ ] ✅ Redirect a /dashboard después de login
- [ ] ✅ Dashboard carga datos (no error 500)
- [ ] ✅ Sidebar muestra opciones del menú

**Si falla:** Revisa `console.log()` en navegador + Sentry

---

## PASO 2: Validar Tablas Críticas (15 min)

En **Supabase Dashboard > SQL Editor**:

```sql
-- 1. Contar tablas (debe ser ~50+)
SELECT COUNT(*) as tabla_count
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 2. Verificar tenants existen
SELECT id, name, is_active 
FROM companies 
ORDER BY created_at;
-- Esperado: CISE, GRUAS

-- 3. Contar usuarios
SELECT COUNT(*) as profile_count
FROM profiles;
-- Esperado: 10+

-- 4. Contar terceros (clientes/proveedores)
SELECT COUNT(*) as terceros_count
FROM terceros;
-- Esperado: 1000+

-- 5. Contar cotizaciones
SELECT COUNT(*) as cotizaciones_count
FROM cotizaciones;
-- Esperado: 100+

-- 6. Contar tareas
SELECT COUNT(*) as tareas_count
FROM tareas;
-- Esperado: 500+

-- 7. Contar reportes
SELECT COUNT(*) FROM reportes_jornada
UNION ALL
SELECT COUNT(*) FROM reportes_maquinaria
UNION ALL
SELECT COUNT(*) FROM reportes_personal;
-- Esperado: 1000+
```

**Documentar resultados:**

```
Tablas: ___ (debe ser 50+)
Companies: ___ (debe ser 2)
Profiles: ___ (debe ser 10+)
Terceros: ___ (debe ser 1000+)
Cotizaciones: ___ (debe ser 100+)
Tareas: ___ (debe ser 500+)
Reportes: ___ (debe ser 1000+)
```

---

## PASO 3: Validar Integridad de FKs (15 min)

```sql
-- 1. Orphaned terceros_sitios (debe retornar 0)
SELECT COUNT(*) as orphaned
FROM terceros_sitios ts
WHERE NOT EXISTS (SELECT 1 FROM terceros t WHERE t.id = ts.tercero_id);

-- 2. Orphaned tareas_recursos (debe retornar 0)
SELECT COUNT(*) as orphaned
FROM tareas_recursos tr
WHERE NOT EXISTS (SELECT 1 FROM tareas t WHERE t.id = tr.tarea_id);

-- 3. Orphaned cotizaciones_detalle (debe retornar 0)
SELECT COUNT(*) as orphaned
FROM cotizaciones_detalle cd
WHERE NOT EXISTS (SELECT 1 FROM cotizaciones c WHERE c.id = cd.cotizacion_id);

-- 4. Orphaned reportes_maquinaria (debe retornar 0)
SELECT COUNT(*) as orphaned
FROM reportes_maquinaria rm
WHERE NOT EXISTS (SELECT 1 FROM maquinaria m WHERE m.id = rm.maquinaria_id);

-- 5. Orphaned profiles (debe retornar 0)
SELECT COUNT(*) as orphaned
FROM profiles p
WHERE p.tenant_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = p.tenant_id);
```

**Si alguno retorna > 0:** Hay corrupción de datos. Documentar y reportar.

---

## PASO 4: Validar RLS Policies (10 min)

```sql
-- 1. Verificar que RLS está habilitado en tablas críticas
SELECT tablename 
FROM pg_tables pt
WHERE schemaname = 'public'
  AND EXISTS (
    SELECT 1 FROM pg_class pc
    JOIN pg_namespace pn ON pc.relnamespace = pn.oid
    WHERE pn.nspname = 'public' 
      AND pc.relname = pt.tablename
      AND pc.relrowsecurity = true
  );

-- 2. Listar todas las RLS policies
SELECT schemaname, tablename, policyname, permissive
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Esperado: 50+ policies, todas 'PERMISSIVE'
```

**Validar:**
- [ ] Mínimo 30+ policies listadas
- [ ] Ninguna 'RESTRICTIVE'
- [ ] Tablas críticas (companies, profiles, terceros, etc.) tienen policies

---

## PASO 5: Smoke Tests E2E (30 min)

```bash
# Terminal 1: Dev server sigue corriendo

# Terminal 2: Ejecutar smoke tests
cd C:\Proyectos\reportaweb3
npm run test:e2e:smoke

# Esperar a que termine (~30s)
```

**Esperado:** 18/18 tests en ✅ PASS

**Si alguno falla:**
```bash
# Ver detalle del error
npm run test:e2e:report
# Se abre HTML report, revisar qué falló
```

---

## PASO 6: Revisar Errores en Sentry (10 min)

Ve a **https://sentry.io/organizations/reporta-la/** (o tu Sentry):

1. Selecciona proyecto `reportaweb3`
2. Filtra últimas 24 horas
3. ¿Hay errores nuevos relacionados con BD?

**Esperado:** 0 errores de BD (o los mismos errores históricos)

---

## PASO 7: Validar Cada Módulo (Opcional, 30 min extra)

Si los pasos 1-6 están todos ✅, entonces:

```bash
# Ejecutar full E2E suite
npm run test:e2e

# Esperar 40 minutos...
# Esperado: 347+/374 (95%+) en PASS
```

---

## Checklist Final de Validación

- [ ] **PASO 1:** App conecta y UI carga ✅
- [ ] **PASO 2:** Tablas tienen datos (rowcounts OK) ✅
- [ ] **PASO 3:** Sin orphaned FKs (integridad OK) ✅
- [ ] **PASO 4:** RLS policies activas (seguridad OK) ✅
- [ ] **PASO 5:** Smoke tests 18/18 (conectividad OK) ✅
- [ ] **PASO 6:** Sentry sin errores nuevos ✅
- [ ] **PASO 7:** Full E2E suite 95%+ (opcional) ✅

---

## Si Todo Está Verde ✅

### Celebra: BD está 100% recuperada

Luego haz:

1. **Backup final**
   ```sql
   -- En Supabase: Database > Backups > Request backup
   -- O espera backup automático de la noche
   ```

2. **Anuncio a usuarios**
   ```
   "Sistema reporta.app está 100% operacional.
    Todos los datos históricos han sido verificados.
    Gracias por la paciencia."
   ```

3. **Documentar en git**
   ```bash
   git add RECOVERY_STATUS_UPDATE.md VALIDATION_QUICK_START.md PROGRESS.md
   git commit -m "docs: BD recuperada - validación completa OK"
   git push
   ```

---

## Si Algo Falla ❌

### Opción 1: Error en PASO 1 (App no conecta)

```bash
# Revisar env vars
cat .env.local | grep SUPABASE

# Debe tener:
# NEXT_PUBLIC_SUPABASE_URL=https://fqwhagryqkkhbgznxtwf.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Si está mal, actualizar y reiniciar app
npm run dev
```

### Opción 2: Error en PASO 2-3 (Datos faltantes o corruptos)

Documentar:
```
Tabla: ___ 
Rowcount esperado: ___
Rowcount actual: ___
Qué está faltando: ___
```

Luego: Contactarme con detalles exactos.

### Opción 3: Error en PASO 5 (Tests fallan)

```bash
# Ver qué test falla
npm run test:e2e:report

# Abrir reporte HTML, revisar screenshot del error
# Documentar error + reporte en issue
```

---

## Tiempo Total Estimado

| Paso | Duración | Total |
|------|----------|-------|
| 1. App conecta | 10 min | 10 min |
| 2. Datos SQL | 15 min | 25 min |
| 3. Integridad FK | 15 min | 40 min |
| 4. RLS policies | 10 min | 50 min |
| 5. Smoke tests | 30 min | 80 min |
| 6. Sentry | 10 min | 90 min |
| **TOTAL** | — | **~1.5 horas** |

**Adicional (opcional):**
- Full E2E suite: +40 min

---

## Siguientes Pasos (Si TODO verde ✅)

1. **CUTOVER:** Sistema está listo para producción
2. **COMUNICAR:** Anunciar recuperación a equipo + usuarios
3. **MONITOR:** Revisar Sentry 24-48h post-cutover
4. **CELEBRAR:** ¡BD recuperada! 🎉

---

**¿Quieres que empecemos?** 

Di cuándo pasaste cada validación y yo te guío. O, si prefieres, hazlas todas ahora y reporta resultados.

Estoy listo cuando quieras. 🚀

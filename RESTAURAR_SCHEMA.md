# 🔄 RESTAURAR SCHEMA SUPABASE - GUÍA COMPLETA

## 📋 Resumen rápido

Después de borrar ambas BDs de Supabase por error, usaremos los scripts automatizados para restaurar la estructura desde el schema SQL guardado en git. **No necesitamos los datos — los migramos de Bubble después.**

---

## ✅ Requisitos

- [ ] PostgreSQL instalado (con `psql` en PATH)
- [ ] Acceso a https://supabase.com/dashboard
- [ ] 2 nuevos proyectos Supabase creados (TEST + PROD)
- [ ] PowerShell en Windows (versión 7+)

### Instalar PostgreSQL (si no lo tienes)
```bash
# Windows: Descarga desde https://www.postgresql.org/download/windows/
# Importante: Durante instalación, marca "Add PostgreSQL to PATH"

# Verificar instalación
psql --version
```

---

## 🚀 PASO 1: Crear nuevos proyectos Supabase

1. Ve a **https://supabase.com/dashboard**
2. Haz clic en **"New Project"**

### Para BD TEST (USA):
- **Name:** reporta-test (o similar)
- **Region:** us-east-1 (USA)
- **Database Password:** Guárdalo (lo usaremos en el script)
- ✓ Crear

### Para BD PROD (Brazil):
- **Name:** reporta-prod (o similar)
- **Region:** sa-east-1 (Brazil)
- **Database Password:** Guárdalo (lo usaremos en el script)
- ✓ Crear

Espera a que ambos proyectos estén listos (~2 min cada uno).

---

## 🔧 PASO 2: Ejecutar script de restauración de schema

Abre **PowerShell como Administrador** y ejecuta:

```powershell
cd c:\Proyectos\reportaweb3

# Ejecutar el script de restauración
.\restore-supabase-schema.ps1
```

**El script te pedirá:**

1. **Host TEST** - Lo encuentras en:
   - Dashboard Supabase → Tu proyecto TEST → Settings → Database → Connection Info
   - Copia: `db.xyz123abc.supabase.co`

2. **Contraseña TEST** - La que creaste al crear el proyecto

3. **Host PROD** - Lo encuentras en:
   - Dashboard Supabase → Tu proyecto PROD → Settings → Database → Connection Info
   - Copia: `db.xyz456def.supabase.co`

4. **Contraseña PROD** - La que creaste al crear el proyecto

**El script hará:**
- ✓ Validar conexiones a ambas BDs
- ✓ Aplicar 1359 líneas de SQL (schema completo)
- ✓ Crear ~70 tablas, funciones, triggers, RLS
- ✓ Validar que todo se creó correctamente

**Tiempo estimado:** 3-5 minutos

---

## 🔑 PASO 3: Obtener y actualizar credentials

Ahora necesitas los **API keys** de ambos proyectos para que APP y WEB se conecten.

### Obtener los credentials:

1. Dashboard Supabase → Proyecto TEST → Settings → API
   - Copia: **Project URL**
   - Copia: **anon public key**

2. Dashboard Supabase → Proyecto PROD → Settings → API
   - Copia: **Project URL**
   - Copia: **anon public key**
   - Copia: **service_role key** (KEY con permisos, la roja)

### Ejecutar script de actualización:

```powershell
cd c:\Proyectos\reportaweb3

.\update-env-credentials.ps1
```

**El script te pedirá:**
1. URL TEST
2. ANON KEY TEST
3. URL PROD
4. ANON KEY PROD
5. SERVICE ROLE KEY PROD

Luego actualiza automáticamente:
- `C:\Proyectos\reporta-app\.env.local`
- `c:\Proyectos\reportaweb3\.env.local`

---

## ✔️ PASO 4: Verificar que funciona

### Test APP:
```bash
cd C:\Proyectos\reporta-app

npm install  # Si es primera vez
npm start    # Inicia el servidor Expo

# Intenta hacer login (deberá fallar en pantalla de login porque no hay usuarios)
# Pero verifica que se conecta a la BD (no errores de conexión)
```

### Test WEB:
```bash
cd c:\Proyectos\reportaweb3

npm install  # Si es primera vez
npm run dev  # http://localhost:3000

# Intenta acceder
# Deberá mostrarte la pantalla de login (sin errores de BD)
```

Si ves **errores de conexión a BD** → repasa los credentials en `.env.local`.

---

## 📊 PASO 5: Verificar que el schema se restauró correctamente

**En PowerShell:**

```powershell
# Conectarse a TEST
$env:PGPASSWORD="tu_contraseña_test"
psql -h db.xyz123abc.supabase.co -U postgres -d postgres -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"

# Deberá mostrar: ~70 tablas
```

**Tablas clave que deberían existir:**
- `companies` (tenants)
- `profiles` (usuarios)
- `terceros` (clientes)
- `cotizaciones` (quotes)
- `maquinarias` (equipment)
- `tareas` (tasks)
- `formatos` (checklists)

---

## 🔄 PASO 6: Migrar datos desde Bubble

Ahora que tienes la estructura lista, migra los datos:

```bash
cd c:\Proyectos\reportaweb3

# Si tienes un script de migración desde Bubble
npm run migrate:bubble

# O manualmente usando los dumps que tienes en git
# (bubble_cotizaciones_dump.json, bubble_tercero_dump.json, etc.)
```

---

## 🐛 Troubleshooting

### Error: "psql no encontrado"
```
Solución: Instala PostgreSQL desde https://www.postgresql.org/download/windows/
Asegúrate de marcar "Add to PATH" durante la instalación
Reinicia PowerShell después
```

### Error: "Host no encontrado" o "conexión rechazada"
```
Solución: 
1. Verifica que el host es correcto (sin https://, sin trailing slashes)
2. Verifica que la contraseña es correcta
3. Verifica que en Supabase el proyecto dice "Active"
```

### Error: "ROLE 'postgres' does not exist"
```
Solución: Normalmente ya existe. Si Supabase no la creó, crea el proyecto nuevamente.
```

### Las tablas no se crearon
```
Solución: 
1. Revisa que el script no mostró errores fatales (algunos "IF EXISTS" son normales)
2. Ejecuta manualmente:
   psql -h tu_host -U postgres -d postgres -f C:\Proyectos\reportaweb3\supabase_consolidated_migration.sql
3. Revisa psql en el dashboard SQL Editor de Supabase
```

---

## 📁 Archivos involucrados

| Archivo | Propósito |
|---------|-----------|
| `supabase_consolidated_migration.sql` | Schema SQL completo (1359 líneas) |
| `restore-supabase-schema.ps1` | Script que aplica el schema a ambas BDs |
| `update-env-credentials.ps1` | Script que actualiza `.env.local` con nuevos credentials |
| `C:\Proyectos\reporta-app\.env.local` | Conecta APP a TEST |
| `c:\Proyectos\reportaweb3\.env.local` | Conecta WEB a PROD |

---

## ⏱️ Timeline estimado

| Paso | Tiempo |
|------|--------|
| Crear proyectos Supabase | 5 min |
| Ejecutar script schema | 5 min |
| Obtener API keys | 2 min |
| Ejecutar script credentials | 1 min |
| Verificar conexión APP/WEB | 5 min |
| **TOTAL** | **~18 min** |

---

## ✅ Checklist final

```
Antes de migrar datos:

[ ] Ambos proyectos Supabase creados y activos
[ ] Script restore-supabase-schema.ps1 ejecutado sin errores
[ ] Script update-env-credentials.ps1 ejecutado sin errores
[ ] APP se inicia (npm start) sin errores de BD
[ ] WEB se inicia (npm run dev) sin errores de BD
[ ] Puedes ver tablas en Supabase SQL Editor
[ ] .env.local en ambos repos actualizado correctamente
[ ] Listo para migrar datos de Bubble
```

---

## 🆘 Soporte

Si algo falla:
1. Revisa los logs del script (están en la salida de PowerShell)
2. Verifica los credentials en Supabase dashboard
3. Ejecuta manualmente en SQL Editor de Supabase:
   ```sql
   SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';
   ```

---

**¡Listo para restaurar!** 🚀

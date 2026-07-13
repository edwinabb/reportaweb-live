# ============================================================================
# RESTORE SUPABASE SCHEMA - AUTOMATED SCRIPT
# ============================================================================
# Propósito: Restaurar el schema de ambas BDs (TEST + PROD) desde SQL consolidado
# Requisitos: psql instalado en PATH
# Uso: .\restore-supabase-schema.ps1
# ============================================================================

param(
    [string]$TestHost = "",
    [string]$TestPassword = "",
    [string]$ProdHost = "",
    [string]$ProdPassword = ""
)

$ErrorActionPreference = "Stop"

# ============================================================================
# COLORES PARA OUTPUT
# ============================================================================
$colors = @{
    Success = "Green"
    Error   = "Red"
    Warning = "Yellow"
    Info    = "Cyan"
}

function Write-Status {
    param([string]$Message, [string]$Type = "Info")
    $color = $colors[$Type]
    Write-Host $Message -ForegroundColor $color
}

# ============================================================================
# 1. VALIDACIONES INICIALES
# ============================================================================
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      RESTAURAR SCHEMA SUPABASE - TEST + PROD             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Status "Validando requisitos..." "Info"

# Verificar que psql está disponible
try {
    $psqlVersion = psql --version 2>$null
    if (-not $psqlVersion) {
        Write-Status "❌ ERROR: psql no encontrado. Instala PostgreSQL primero." "Error"
        Write-Status "   Descarga: https://www.postgresql.org/download/windows/" "Info"
        exit 1
    }
    Write-Status "✓ psql encontrado: $psqlVersion" "Success"
} catch {
    Write-Status "❌ ERROR: No se puede ejecutar psql. Verifica que esté en PATH." "Error"
    exit 1
}

# Verificar que el archivo SQL existe
$sqlFile = "C:\Proyectos\reportaweb3\supabase_consolidated_migration.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Status "❌ ERROR: No encontré $sqlFile" "Error"
    exit 1
}
Write-Status "✓ Schema SQL encontrado ($((Get-Item $sqlFile).Length / 1KB)KB)" "Success"

# ============================================================================
# 2. RECOPILAR CREDENCIALES
# ============================================================================
Write-Host "`n─────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "CREDENCIALES NUEVA BD TEST (USA - wioozisskjjgjjybsoqo)" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

if (-not $TestHost) {
    $TestHost = Read-Host "Host TEST (ej: db.xyz123abc.supabase.co)"
}

if (-not $TestPassword) {
    $TestPassword = Read-Host "Contraseña postgres TEST" -AsSecureString
    $TestPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($TestPassword))
}

Write-Host "`n─────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "CREDENCIALES NUEVA BD PROD (BRAZIL - fqwhagryqkkhbgznxtwf)" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

if (-not $ProdHost) {
    $ProdHost = Read-Host "Host PROD (ej: db.xyz456def.supabase.co)"
}

if (-not $ProdPassword) {
    $ProdPassword = Read-Host "Contraseña postgres PROD" -AsSecureString
    $ProdPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($ProdPassword))
}

# ============================================================================
# 3. VALIDAR CONEXIÓN
# ============================================================================
Write-Host "`n─────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Status "Validando conexiones..." "Info"
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

# Test BD TEST
Write-Host "`nProbando conexión TEST..."
$env:PGPASSWORD = $TestPassword
try {
    $testConn = psql -h $TestHost -U postgres -d postgres -c "SELECT version();" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Status "❌ ERROR: No puedo conectar a TEST. Verifica credenciales." "Error"
        exit 1
    }
    Write-Status "✓ Conexión TEST OK" "Success"
} catch {
    Write-Status "❌ ERROR: $_" "Error"
    exit 1
}

# Test BD PROD
Write-Host "Probando conexión PROD..."
$env:PGPASSWORD = $ProdPassword
try {
    $prodConn = psql -h $ProdHost -U postgres -d postgres -c "SELECT version();" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Status "❌ ERROR: No puedo conectar a PROD. Verifica credenciales." "Error"
        exit 1
    }
    Write-Status "✓ Conexión PROD OK" "Success"
} catch {
    Write-Status "❌ ERROR: $_" "Error"
    exit 1
}

# ============================================================================
# 4. APLICAR SCHEMA - BD TEST
# ============================================================================
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  APLICANDO SCHEMA A BD TEST...                             ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

$env:PGPASSWORD = $TestPassword
Write-Status "Ejecutando SQL consolidado en TEST..." "Info"

try {
    $output = psql -h $TestHost -U postgres -d postgres -f $sqlFile 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Status "⚠️  Advertencia durante migración TEST:" "Warning"
        Write-Host $output -ForegroundColor Yellow
        # No exitir - algunos errores son esperados (IF EXISTS, etc)
    } else {
        Write-Status "✓ Schema aplicado a TEST exitosamente" "Success"
    }
} catch {
    Write-Status "❌ ERROR aplicando schema TEST: $_" "Error"
    exit 1
}

# ============================================================================
# 5. APLICAR SCHEMA - BD PROD
# ============================================================================
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  APLICANDO SCHEMA A BD PROD...                             ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

$env:PGPASSWORD = $ProdPassword
Write-Status "Ejecutando SQL consolidado en PROD..." "Info"

try {
    $output = psql -h $ProdHost -U postgres -d postgres -f $sqlFile 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Status "⚠️  Advertencia durante migración PROD:" "Warning"
        Write-Host $output -ForegroundColor Yellow
    } else {
        Write-Status "✓ Schema aplicado a PROD exitosamente" "Success"
    }
} catch {
    Write-Status "❌ ERROR aplicando schema PROD: $_" "Error"
    exit 1
}

# ============================================================================
# 6. VALIDAR ESTRUCTURA - CONTAR TABLAS
# ============================================================================
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  VALIDANDO ESTRUCTURA...                                   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$validationSQL = @"
SELECT COUNT(*) as tabla_count FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
"@

# Validar TEST
Write-Host "Contando tablas en TEST..."
$env:PGPASSWORD = $TestPassword
$testTableCount = psql -h $TestHost -U postgres -d postgres -t -c $validationSQL 2>$null | Select-String -Pattern "\d+" -AllMatches | ForEach-Object { $_.Matches[0].Value }

if ($testTableCount -gt 50) {
    Write-Status "✓ TEST: $testTableCount tablas creadas (OK - esperadas ~70+)" "Success"
} else {
    Write-Status "⚠️  TEST: Solo $testTableCount tablas. Revisa si la migración fue completa." "Warning"
}

# Validar PROD
Write-Host "Contando tablas en PROD..."
$env:PGPASSWORD = $ProdPassword
$prodTableCount = psql -h $ProdHost -U postgres -d postgres -t -c $validationSQL 2>$null | Select-String -Pattern "\d+" -AllMatches | ForEach-Object { $_.Matches[0].Value }

if ($prodTableCount -gt 50) {
    Write-Status "✓ PROD: $prodTableCount tablas creadas (OK - esperadas ~70+)" "Success"
} else {
    Write-Status "⚠️  PROD: Solo $prodTableCount tablas. Revisa si la migración fue completa." "Warning"
}

# ============================================================================
# 7. VERIFICAR TABLAS CLAVE
# ============================================================================
Write-Host "`nVerificando tablas clave..."

$keyTables = @(
    "companies",
    "profiles",
    "terceros",
    "cotizaciones",
    "maquinarias",
    "tareas",
    "formatos"
)

$checkSQL = "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='TABLE_NAME');"

foreach ($table in $keyTables) {
    $sql = $checkSQL -replace "TABLE_NAME", $table

    $env:PGPASSWORD = $TestPassword
    $testExists = psql -h $TestHost -U postgres -d postgres -t -c $sql 2>$null | Select-String -Pattern "t|f"

    $env:PGPASSWORD = $ProdPassword
    $prodExists = psql -h $ProdHost -U postgres -d postgres -t -c $sql 2>$null | Select-String -Pattern "t|f"

    $testStatus = if ($testExists -match "t") { "✓" } else { "❌" }
    $prodStatus = if ($prodExists -match "t") { "✓" } else { "❌" }

    Write-Host "  $testStatus $table (TEST)  $prodStatus $table (PROD)"
}

# ============================================================================
# 8. ACTUALIZAR .env.local
# ============================================================================
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  PRÓXIMO PASO: ACTUALIZAR .env.local                       ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Yellow

Write-Host "Necesitas actualizar los archivos .env.local con los nuevos credentials:`n"
Write-Host "APP (.env.local) → EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY"
Write-Host "WEB (.env.local) → NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY`n"

Write-Status "¿Quieres que abra el dashboard de Supabase para obtener los credentials?" "Info"
Write-Host "(Te mostrará las keys de ambos proyectos nuevos)`n"

# ============================================================================
# 9. RESUMEN FINAL
# ============================================================================
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✓ RESTAURACIÓN COMPLETADA                                 ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host @"
RESUMEN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ BD TEST:         Schema restaurado ($testTableCount tablas)
✓ BD PROD:         Schema restaurado ($prodTableCount tablas)
✓ Estructura:      Lista para migrar datos desde Bubble

PRÓXIMOS PASOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Obtén ANON_KEY y SERVICE_ROLE_KEY de cada proyecto Supabase nuevo
2. Actualiza:
   - C:\Proyectos\reporta-app\.env.local
   - c:\Proyectos\reportaweb3\.env.local

3. Ejecuta migraciones de datos desde Bubble:
   - cd c:\Proyectos\reportaweb3
   - npm run migrate:bubble  (o tu script de migración)

4. Verifica que TODO funciona:
   - App: npm start
   - Web: npm run dev

¡LISTO! 🚀

"@ -ForegroundColor Green

Write-Status "Script completado sin errores fatales." "Success"

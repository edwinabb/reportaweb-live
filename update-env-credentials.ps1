# ============================================================================
# UPDATE .env.local WITH NEW SUPABASE CREDENTIALS
# ============================================================================
# Propósito: Actualizar los archivos .env.local con nuevos credentials
# de Supabase (después de crear los nuevos proyectos)
# Uso: .\update-env-credentials.ps1
# ============================================================================

param(
    [string]$TestUrl = "",
    [string]$TestAnonKey = "",
    [string]$ProdUrl = "",
    [string]$ProdAnonKey = "",
    [string]$ProdServiceRoleKey = ""
)

$ErrorActionPreference = "Stop"

$colors = @{
    Success = "Green"
    Error   = "Red"
    Warning = "Yellow"
    Info    = "Cyan"
}

function Write-Status {
    param([string]$Message, [string]$Type = "Info")
    Write-Host $Message -ForegroundColor $colors[$Type]
}

# ============================================================================
# 1. RECOPILAR CREDENTIALS
# ============================================================================
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ACTUALIZAR CREDENTIALS EN .env.local                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Status "Para obtener los credentials:" "Info"
Write-Host @"
1. Abre https://supabase.com/dashboard
2. Selecciona tu nueva BD TEST
3. Copia Settings → API → Project URL → paste abajo
4. Copia Settings → API → Project API keys → anon public key
5. Repite para PROD

"@

Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "BD TEST (USA - wioozisskjjgjjybsoqo)" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

if (-not $TestUrl) {
    $TestUrl = Read-Host "URL TEST (ej: https://xyz123abc.supabase.co)"
}
if (-not $TestAnonKey) {
    $TestAnonKey = Read-Host "ANON KEY TEST"
}

Write-Host "`n─────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "BD PROD (BRAZIL - fqwhagryqkkhbgznxtwf)" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────" -ForegroundColor Gray

if (-not $ProdUrl) {
    $ProdUrl = Read-Host "URL PROD (ej: https://xyz456def.supabase.co)"
}
if (-not $ProdAnonKey) {
    $ProdAnonKey = Read-Host "ANON KEY PROD"
}
if (-not $ProdServiceRoleKey) {
    $ProdServiceRoleKey = Read-Host "SERVICE ROLE KEY PROD"
}

# ============================================================================
# 2. VALIDAR FORMATO
# ============================================================================
Write-Status "Validando formato..." "Info"

$validation = $true
if (-not ($TestUrl -match "https://.*\.supabase\.co")) {
    Write-Status "❌ URL TEST inválida" "Error"
    $validation = $false
}
if ($TestAnonKey.Length -lt 50) {
    Write-Status "❌ ANON KEY TEST demasiado corta" "Error"
    $validation = $false
}
if (-not ($ProdUrl -match "https://.*\.supabase\.co")) {
    Write-Status "❌ URL PROD inválida" "Error"
    $validation = $false
}
if ($ProdAnonKey.Length -lt 50) {
    Write-Status "❌ ANON KEY PROD demasiado corta" "Error"
    $validation = $false
}
if ($ProdServiceRoleKey.Length -lt 100) {
    Write-Status "❌ SERVICE ROLE KEY PROD demasiado corta" "Error"
    $validation = $false
}

if (-not $validation) {
    exit 1
}

Write-Status "✓ Todos los credentials validados" "Success"

# ============================================================================
# 3. ACTUALIZAR APP .env.local
# ============================================================================
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ACTUALIZANDO APP .env.local                               ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

$appEnvPath = "C:\Proyectos\reporta-app\.env.local"

if (-not (Test-Path $appEnvPath)) {
    Write-Status "❌ No encontré $appEnvPath" "Error"
    exit 1
}

Write-Status "Leyendo archivo actual..." "Info"
$appEnvContent = Get-Content $appEnvPath -Raw

# Actualizar líneas
$appEnvContent = $appEnvContent -replace `
    'EXPO_PUBLIC_SUPABASE_URL=.*', `
    "EXPO_PUBLIC_SUPABASE_URL=$TestUrl"

$appEnvContent = $appEnvContent -replace `
    'EXPO_PUBLIC_SUPABASE_ANON_KEY=.*', `
    "EXPO_PUBLIC_SUPABASE_ANON_KEY=$TestAnonKey"

# Guardar
Set-Content -Path $appEnvPath -Value $appEnvContent -NoNewline
Write-Status "✓ APP .env.local actualizado" "Success"
Write-Host "   URL:      $TestUrl"
Write-Host "   ANON_KEY: $($TestAnonKey.Substring(0,20))..."

# ============================================================================
# 4. ACTUALIZAR WEB .env.local
# ============================================================================
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ACTUALIZANDO WEB .env.local                               ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

$webEnvPath = "c:\Proyectos\reportaweb3\.env.local"

if (-not (Test-Path $webEnvPath)) {
    Write-Status "❌ No encontré $webEnvPath" "Error"
    exit 1
}

Write-Status "Leyendo archivo actual..." "Info"
$webEnvContent = Get-Content $webEnvPath -Raw

# Actualizar líneas de PROD
$webEnvContent = $webEnvContent -replace `
    'NEXT_PUBLIC_SUPABASE_URL=.*', `
    "NEXT_PUBLIC_SUPABASE_URL=$ProdUrl"

$webEnvContent = $webEnvContent -replace `
    'NEXT_PUBLIC_SUPABASE_ANON_KEY=.*', `
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ProdAnonKey"

$webEnvContent = $webEnvContent -replace `
    'CLOUD_SUPABASE_URL=.*', `
    "CLOUD_SUPABASE_URL=$ProdUrl"

$webEnvContent = $webEnvContent -replace `
    'SUPABASE_SERVICE_ROLE_KEY=.*', `
    "SUPABASE_SERVICE_ROLE_KEY=$ProdServiceRoleKey"

# También actualizar CLOUD_SUPABASE_ROLE_KEY
$webEnvContent = $webEnvContent -replace `
    'CLOUD_SUPABASE_ROLE_KEY=.*', `
    "CLOUD_SUPABASE_ROLE_KEY=$ProdServiceRoleKey"

# Guardar
Set-Content -Path $webEnvPath -Value $webEnvContent -NoNewline
Write-Status "✓ WEB .env.local actualizado" "Success"
Write-Host "   URL:                  $ProdUrl"
Write-Host "   ANON_KEY:             $($ProdAnonKey.Substring(0,20))..."
Write-Host "   SERVICE_ROLE_KEY:     $($ProdServiceRoleKey.Substring(0,20))..."

# ============================================================================
# 5. VERIFICAR CAMBIOS
# ============================================================================
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  VERIFICANDO CAMBIOS                                       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "APP .env.local (primeras 3 líneas):"
(Get-Content $appEnvPath | Select-Object -First 3) | ForEach-Object { Write-Host "  $_" }

Write-Host "`nWEB .env.local (credenciales actualizados):"
(Get-Content $webEnvPath | Where-Object { $_ -match "SUPABASE" -or $_ -match "CLOUD" } | Select-Object -First 5) | ForEach-Object { Write-Host "  $_" }

# ============================================================================
# 6. RESUMEN
# ============================================================================
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✓ CREDENTIALS ACTUALIZADOS                                ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host @"
✓ APP .env.local   → Apunta a TEST (USA)
✓ WEB .env.local   → Apunta a PROD (Brazil)

PRÓXIMOS PASOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Verifica que APP y WEB inician:
   APP:  cd C:\Proyectos\reporta-app && npm start
   WEB:  cd c:\Proyectos\reportaweb3 && npm run dev

2. Inicia migraciones de datos desde Bubble

3. Prueba login en ambas plataformas

¡LISTO! 🚀

" -ForegroundColor Green

Write-Status "Script completado exitosamente." "Success"

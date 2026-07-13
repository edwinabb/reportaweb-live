# ============================================================================
# MAIN MENU - RESTAURAR SCHEMA SUPABASE
# ============================================================================
# Menú interactivo para restaurar la BD desde cero
# ============================================================================

$ErrorActionPreference = "Continue"

function Show-Banner {
    Clear-Host
    Write-Host @"
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║           🔄 RESTAURAR SCHEMA SUPABASE - BD ELIMINADA                   ║
║                                                                           ║
║        Este script te guía paso a paso para recuperar la estructura      ║
║        de ambas bases de datos (TEST + PROD) desde el SQL en git.       ║
║                                                                           ║
║              ⚠️  IMPORTANTE: Ya obtuviste 2 nuevos proyectos            ║
║                 Supabase antes de ejecutar esto                         ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

" -ForegroundColor Cyan
}

function Show-Menu {
    Write-Host @"
OPCIONES:
─────────────────────────────────────────────────────────────────────────────

  1) 📖 VER GUÍA COMPLETA (RESTAURAR_SCHEMA.md)
     Abre el archivo de instrucciones detalladas en tu editor

  2) ⚙️  EJECUTAR: Restaurar Schema a ambas BDs
     Aplica supabase_consolidated_migration.sql a TEST + PROD
     (Necesitas hosts y contraseñas de las BDs)

  3) 🔑 EJECUTAR: Actualizar .env.local con nuevos credentials
     Actualiza APP y WEB para que apunten a los nuevos proyectos
     (Necesitas API keys de Supabase)

  4) ✅ VERIFICAR: Validar que se restauró correctamente
     Conecta y valida que las tablas existen

  5) 📋 MOSTRAR: Estado actual de archivos .env.local
     Muestra qué credentials tiene configurados

  6) 🔗 ABRIR: Dashboard de Supabase en navegador
     Para obtener credentials e información de los proyectos

  0) ❌ SALIR

─────────────────────────────────────────────────────────────────────────────

" -ForegroundColor Green
}

function Open-Guia {
    Write-Host "Abriendo RESTAURAR_SCHEMA.md..." -ForegroundColor Cyan
    $gPath = "c:\Proyectos\reportaweb3\RESTAURAR_SCHEMA.md"
    if (Test-Path $gPath) {
        & "notepad" $gPath
    } else {
        Write-Host "❌ No encontré el archivo" -ForegroundColor Red
    }
}

function Run-RestoreSchema {
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║  EJECUTANDO: restore-supabase-schema.ps1                   ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Yellow

    $scriptPath = "c:\Proyectos\reportaweb3\restore-supabase-schema.ps1"
    if (Test-Path $scriptPath) {
        & $scriptPath
    } else {
        Write-Host "❌ No encontré restore-supabase-schema.ps1" -ForegroundColor Red
    }

    Read-Host "`n[Presiona Enter para continuar]"
}

function Run-UpdateEnv {
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║  EJECUTANDO: update-env-credentials.ps1                    ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Yellow

    $scriptPath = "c:\Proyectos\reportaweb3\update-env-credentials.ps1"
    if (Test-Path $scriptPath) {
        & $scriptPath
    } else {
        Write-Host "❌ No encontré update-env-credentials.ps1" -ForegroundColor Red
    }

    Read-Host "`n[Presiona Enter para continuar]"
}

function Show-EnvStatus {
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  ESTADO ACTUAL DE .env.local                               ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

    Write-Host "📱 APP - C:\Proyectos\reporta-app\.env.local" -ForegroundColor Yellow
    Write-Host "─────────────────────────────────────────────────────────────"
    $appPath = "C:\Proyectos\reporta-app\.env.local"
    if (Test-Path $appPath) {
        Get-Content $appPath | Where-Object { $_ -match "SUPABASE" } | ForEach-Object {
            if ($_ -match "KEY=") {
                $key = ($_ -split "=")[1]
                Write-Host ($_ -replace $key, "$($key.Substring(0, 20))...")
            } else {
                Write-Host $_
            }
        }
    } else {
        Write-Host "❌ Archivo no encontrado" -ForegroundColor Red
    }

    Write-Host "`n🌐 WEB - c:\Proyectos\reportaweb3\.env.local" -ForegroundColor Yellow
    Write-Host "─────────────────────────────────────────────────────────────"
    $webPath = "c:\Proyectos\reportaweb3\.env.local"
    if (Test-Path $webPath) {
        Get-Content $webPath | Where-Object { $_ -match "SUPABASE" -or $_ -match "CLOUD" } | ForEach-Object {
            if ($_ -match "KEY=") {
                $key = ($_ -split "=")[1]
                Write-Host ($_ -replace $key, "$($key.Substring(0, 20))...")
            } else {
                Write-Host $_
            }
        }
    } else {
        Write-Host "❌ Archivo no encontrado" -ForegroundColor Red
    }

    Read-Host "`n[Presiona Enter para continuar]"
}

function Verify-Restoration {
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  VERIFICAR RESTAURACIÓN                                    ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

    Write-Host "Antes de verificar, necesitamos un host y contraseña de TEST.`n"

    $testHost = Read-Host "Host TEST (ej: db.xyz123abc.supabase.co)"
    $testPassword = Read-Host "Contraseña TEST" -AsSecureString
    $testPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($testPassword))

    Write-Host "`nConectando..." -ForegroundColor Cyan

    $env:PGPASSWORD = $testPassword
    try {
        $tableCount = psql -h $testHost -U postgres -d postgres -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" 2>$null | Select-String -Pattern "\d+" -AllMatches | ForEach-Object { $_.Matches[0].Value }

        if ($tableCount) {
            Write-Host "`n✅ Conexión exitosa" -ForegroundColor Green
            Write-Host "   Tablas encontradas: $tableCount"

            if ([int]$tableCount -ge 50) {
                Write-Host "   Estado: ✓ Schema restaurado correctamente" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  Esperadas ~70 tablas. Pocas encontradas." -ForegroundColor Yellow
            }

            # Verificar tablas clave
            Write-Host "`n   Verificando tablas clave..." -ForegroundColor Cyan
            $keyTables = @("companies", "profiles", "terceros", "cotizaciones", "maquinarias", "tareas", "formatos")

            foreach ($table in $keyTables) {
                $exists = psql -h $testHost -U postgres -d postgres -t -c "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='$table');" 2>$null | Select-String -Pattern "t|f"
                $status = if ($exists -match "t") { "✓" } else { "❌" }
                Write-Host "     $status $table"
            }
        } else {
            Write-Host "`n❌ No se pudo conectar o no hay tablas" -ForegroundColor Red
        }
    } catch {
        Write-Host "`n❌ Error: $_" -ForegroundColor Red
    }

    Read-Host "`n[Presiona Enter para continuar]"
}

function Open-Dashboard {
    Write-Host "`nAbriendo Supabase Dashboard..." -ForegroundColor Cyan
    Start-Process "https://supabase.com/dashboard"
    Write-Host "✓ Abierto en tu navegador" -ForegroundColor Green
    Read-Host "`n[Presiona Enter para continuar]"
}

# ============================================================================
# MAIN LOOP
# ============================================================================

while ($true) {
    Show-Banner
    Show-Menu

    $choice = Read-Host "Selecciona una opción"

    switch ($choice) {
        "1" { Open-Guia }
        "2" { Run-RestoreSchema }
        "3" { Run-UpdateEnv }
        "4" { Verify-Restoration }
        "5" { Show-EnvStatus }
        "6" { Open-Dashboard }
        "0" {
            Write-Host "`n¡Hasta luego! 👋`n" -ForegroundColor Green
            exit
        }
        default {
            Write-Host "`n❌ Opción no válida. Intenta de nuevo.`n" -ForegroundColor Red
            Read-Host "[Presiona Enter]"
        }
    }
}

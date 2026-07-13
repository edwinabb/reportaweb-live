
# Script para actualizar la Base de Datos en la Nube (Supabase)
# Proyecto Ref: timbhcrbisxeniquwwmm

$PROJECT_REF = "timbhcrbisxeniquwwmm"

Write-Host "🚀 Iniciando proceso de actualización para el proyecto: $PROJECT_REF" -ForegroundColor Cyan

# 1. Verificar login
Write-Host "`nStep 1: Verificando sesión de Supabase..." -ForegroundColor Yellow
npx supabase login

# 2. Vincular el proyecto si no lo está
Write-Host "`nStep 2: Vinculando proyecto local con la nube..." -ForegroundColor Yellow
npx supabase link --project-ref $PROJECT_REF

# 3. Comparar cambios (Opcional, para seguridad)
Write-Host "`nStep 3: Verificando migraciones pendientes..." -ForegroundColor Yellow
npx supabase db remote commit

# 4. Empujar cambios
Write-Host "`nStep 4: Aplicando migraciones locales a la nube..." -ForegroundColor Yellow
Write-Host "AVISO: Esto aplicará las 23 migraciones locales al servidor de producción." -ForegroundColor Magenta
$confirm = Read-Host "¿Desea continuar? (S/N)"
if ($confirm -eq "S" -or $confirm -eq "s") {
    npx supabase db push
    Write-Host "`n✅ ¡La base de datos en la nube ha sido actualizada correctamente!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Operación cancelada por el usuario." -ForegroundColor Red
}

Write-Host "`nPresione cualquier tecla para salir..."
$null = [Console]::ReadKey()

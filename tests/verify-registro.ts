import { chromium } from 'playwright'

const BASE = 'https://web-test.reportar.app'

async function main() {
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()

    try {
        // 1. Abrir página de registro
        console.log('1. Abriendo /registro...')
        await page.goto(`${BASE}/registro`, { waitUntil: 'networkidle', timeout: 30000 })
        const title = await page.title()
        console.log(`   Título: ${title}`)

        // 2. Verificar campos del formulario
        console.log('2. Verificando campos del formulario...')
        const fields = [
            'input[placeholder*="Juan"]',
            'input[type="email"]',
            'input[type="password"]',
            'input[placeholder*="empresa"]',
            'select',
        ]
        for (const f of fields) {
            const el = page.locator(f).first()
            const visible = await el.isVisible().catch(() => false)
            console.log(`   ${f}: ${visible ? '✅' : '❌'}`)
        }

        // 3. Llenar el formulario
        console.log('3. Llenando formulario...')
        const ts = Date.now()
        // Usar nth() para seleccionar inputs en orden: nombre, email, password, empresa
        const inputs = page.locator('input')
        await inputs.nth(0).fill(`Test Usuario ${ts}`)           // Nombre completo
        await inputs.nth(1).fill(`trial.test.${ts}@testver.com`) // Email
        await inputs.nth(2).fill('testpassword123')               // Password
        await inputs.nth(3).fill(`Gruas Test ${ts}`)             // Empresa

        // País
        const selectPais = page.locator('select').first()
        await selectPais.selectOption('Perú').catch(() => {})

        // Tipo maquinaria (segundo select si existe)
        const selects = await page.locator('select').count()
        console.log(`   Selectores encontrados: ${selects}`)
        if (selects >= 2) {
            await page.locator('select').nth(1).selectOption('gruas').catch(() => {})
        }

        // Flota size (botones radio)
        await page.locator('button').filter({ hasText: '1' }).first().click().catch(() => {
            console.log('   No se encontró botón de flota, continuando...')
        })

        // Screenshot antes de enviar
        await page.screenshot({ path: 'tests/screenshots/registro-filled.png', fullPage: true })
        console.log('   Screenshot guardado: tests/screenshots/registro-filled.png')

        // 4. Enviar
        console.log('4. Enviando formulario...')
        const submitBtn = page.locator('button[type="submit"]')
        const btnText = await submitBtn.textContent()
        console.log(`   Botón submit: "${btnText}"`)

        await Promise.all([
            page.waitForNavigation({ timeout: 30000 }).catch(() => {}),
            submitBtn.click()
        ])

        await page.waitForTimeout(3000)
        const urlAfter = page.url()
        console.log(`   URL después de submit: ${urlAfter}`)

        // Screenshot del resultado
        await page.screenshot({ path: 'tests/screenshots/registro-result.png', fullPage: true })
        console.log('   Screenshot resultado guardado')

        // 5. Verificar redirección
        const isSuccess = urlAfter.includes('/planificacion') || urlAfter.includes('trial=new') || urlAfter.includes('/dashboard')
        const isError = urlAfter.includes('/registro') && await page.locator('[class*="red"], [class*="error"]').isVisible().catch(() => false)

        console.log(`\n📊 RESULTADO:`)
        console.log(`   URL final: ${urlAfter}`)
        console.log(`   Flujo exitoso: ${isSuccess ? '✅' : '❓'}`)
        console.log(`   Hay error visible: ${isError ? '❌' : 'No'}`)

        if (!isSuccess) {
            const errorText = await page.locator('[class*="red"], [class*="error"], [class*="bg-red"]').textContent().catch(() => 'n/a')
            console.log(`   Mensaje de error: ${errorText}`)
        }

    } finally {
        await browser.close()
    }
}

main().catch(console.error)

export interface TrialEmailData {
  adminName: string
  companyName: string
  fleetType: string | null
  dashboardUrl: string
}

function ctaBtn(url: string, text: string, color = '#EA580C'): string {
  return `<a href="${url}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:24px;font-size:15px;font-weight:600;letter-spacing:0.3px;margin:8px 0;">${text}</a>`
}

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>REPORTAR.APP</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#EA580C;padding:20px 32px;">
              <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:1px;">REPORTAR.APP</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px 32px 24px 32px;color:#111827;font-size:15px;line-height:1.6;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px 32px;border-top:1px solid #E5E7EB;color:#9CA3AF;font-size:12px;text-align:center;">
              REPORTAR.APP &middot; noreply@reportar.app
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function renderTrialEmailDia1(data: TrialEmailData): { subject: string; html: string } {
  const { adminName, companyName, dashboardUrl } = data

  const content = `
    <p style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:#111827;">Hola ${adminName},</p>
    <p style="margin:0 0 16px 0;">Tu trial de REPORTAR.APP ya está activo. Tienes <strong>10 días</strong> para explorar todo.</p>
    <p style="margin:0 0 16px 0;">Cargamos datos de demo en <strong>${companyName}</strong> para que puedas ver cómo funciona desde el primer minuto — sin tener que crear nada desde cero.</p>
    <p style="margin:0 0 24px 0;">Durante los próximos días te vamos a enviar un correo corto por día con una cosa concreta para que puedas probar. Sin spam, sin rollos.</p>
    <p style="margin:0 0 24px 0;">Empieza por el dashboard:</p>
    <p style="margin:0 0 0 0;">${ctaBtn(dashboardUrl, 'Abrir mi dashboard')}</p>
  `

  return {
    subject: `Bienvenido a REPORTA, ${adminName}`,
    html: layout(content),
  }
}

export function renderTrialEmailDia2(data: TrialEmailData): { subject: string; html: string } {
  const { adminName, dashboardUrl } = data

  const content = `
    <p style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:#111827;">Hola ${adminName},</p>
    <p style="margin:0 0 16px 0;">La mayoría de empresas de maquinaria solo factura 2 o 3 servicios. Normalmente porque no tienen bien definido todo lo que pueden cobrar.</p>
    <p style="margin:0 0 16px 0;">REPORTA te ayuda a tener eso claro desde el principio: qué servicio, con qué máquina, a qué precio.</p>
    <p style="margin:0 0 8px 0;">Hoy te propongo una cosa concreta:</p>
    <ol style="margin:0 0 24px 0;padding-left:20px;">
      <li style="margin-bottom:8px;">Entra al módulo <strong>Servicios</strong></li>
      <li style="margin-bottom:8px;">Revisa los servicios de demo que cargamos</li>
      <li style="margin-bottom:0;">Edita uno con tus precios reales</li>
    </ol>
    <p style="margin:0 0 24px 0;">Son 5 minutos. Después ya tienes una base real para empezar a planificar.</p>
    <p style="margin:0 0 0 0;">${ctaBtn(`${dashboardUrl}/servicios`, 'Ver módulo Servicios')}</p>
  `

  return {
    subject: '¿Conoces todos los servicios que puedes facturar con tu flota?',
    html: layout(content),
  }
}

export function renderTrialEmailDia4(data: TrialEmailData): { subject: string; html: string } {
  const { adminName, dashboardUrl } = data

  const content = `
    <p style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:#111827;">Hola ${adminName},</p>
    <p style="margin:0 0 16px 0;">Con REPORTA, tus operarios saben exactamente a dónde van mañana. Sin llamadas. Sin grupos de WhatsApp. Sin confusiones.</p>
    <p style="margin:0 0 8px 0;">Pruébalo ahora:</p>
    <ol style="margin:0 0 24px 0;padding-left:20px;">
      <li style="margin-bottom:8px;">Crea una tarea para mañana en Planificación</li>
      <li style="margin-bottom:8px;">Asigna una máquina y un operario</li>
      <li style="margin-bottom:0;">El operario la ve al instante en la app</li>
    </ol>
    <p style="margin:0 0 24px 0;">Así empieza a desaparecer el "¿a qué sitio voy mañana?" de tus operarios.</p>
    <p style="margin:0 0 0 0;">${ctaBtn(`${dashboardUrl}/planificacion`, 'Abrir Planificación')}</p>
  `

  return {
    subject: 'Tu equipo ya puede ver las tareas de esta semana',
    html: layout(content),
  }
}

export function renderTrialEmailDia6(data: TrialEmailData): { subject: string; html: string } {
  const { adminName, dashboardUrl } = data

  const content = `
    <p style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:#111827;">Hola ${adminName},</p>
    <p style="margin:0 0 16px 0;">El cliente llama pidiendo el reporte de la semana. Sin REPORTA: buscas en el correo, en el Excel, llamas al operario para que te confirme las horas. Media hora perdida.</p>
    <p style="margin:0 0 16px 0;">Con REPORTA: tus operarios registran el trabajo desde la app. Tú generas el PDF en un clic. Sin repicar datos, sin errores.</p>
    <p style="margin:0 0 8px 0;">Pruébalo hoy:</p>
    <ol style="margin:0 0 24px 0;padding-left:20px;">
      <li style="margin-bottom:8px;">Abre la tarea de demo en Planificación</li>
      <li style="margin-bottom:0;">Genera tu primer reporte de maquinaria</li>
    </ol>
    <p style="margin:0 0 24px 0;">${ctaBtn(`${dashboardUrl}/planificacion`, 'Ver mis reportes')}</p>
    <p style="margin:0 0 0 0;color:#6B7280;font-size:13px;border-top:1px solid #E5E7EB;padding-top:16px;"><strong>P.D.</strong> Te quedan 4 días de trial.</p>
  `

  return {
    subject: 'El cliente pide el reporte y tú lo tienes listo en 2 minutos',
    html: layout(content),
  }
}

export function renderTrialEmailDia8(data: TrialEmailData): { subject: string; html: string } {
  const { adminName, dashboardUrl } = data

  const content = `
    <p style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:#111827;">Hola ${adminName},</p>
    <p style="margin:0 0 16px 0;">¿Cuánto generó la excavadora este mes? ¿Cuánto costó operar ese proyecto? ¿El margen real fue el que calculaste al presupuestarlo?</p>
    <p style="margin:0 0 16px 0;">Con el módulo de Valorización lo ves en tiempo real: cuánto generó cada máquina, qué costó operarla y el margen real por proyecto.</p>
    <p style="margin:0 0 24px 0;">Sin esperar a que el contable cuadre los números a fin de mes.</p>
    <p style="margin:0 0 24px 0;">${ctaBtn(`${dashboardUrl}/ventas`, 'Ver Valorización')}</p>
    <p style="margin:0 0 0 0;color:#6B7280;font-size:13px;border-top:1px solid #E5E7EB;padding-top:16px;"><strong>P.D.</strong> Tu trial vence en 2 días.</p>
  `

  return {
    subject: '¿Sabes cuánto generó tu flota este mes?',
    html: layout(content),
  }
}

export function renderTrialEmailDia10(
  data: TrialEmailData & { activateUrl: string; extendUrl: string }
): { subject: string; html: string } {
  const { adminName, activateUrl, extendUrl } = data

  const content = `
    <p style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:#111827;">Hola ${adminName},</p>
    <p style="margin:0 0 16px 0;">Tu trial de 10 días termina hoy.</p>
    <p style="margin:0 0 8px 0;">Durante estos días exploraste:</p>
    <ul style="margin:0 0 24px 0;padding-left:20px;">
      <li style="margin-bottom:8px;"><strong>Servicios</strong> — qué facturas y a qué precio</li>
      <li style="margin-bottom:8px;"><strong>Planificación</strong> — tus operarios saben a dónde van cada día</li>
      <li style="margin-bottom:8px;"><strong>Reportes</strong> — PDF en un clic para el cliente</li>
      <li style="margin-bottom:0;"><strong>Valorización</strong> — el margen real de cada proyecto</li>
    </ul>
    <p style="margin:0 0 24px 0;">Tus datos están guardados. Activa tu cuenta hoy y sigues desde donde lo dejaste.</p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 12px 0;">
      <tr>
        <td style="padding-right:12px;">
          ${ctaBtn(activateUrl, 'Activar mi cuenta', '#16A34A')}
        </td>
        <td>
          ${ctaBtn(extendUrl, 'Necesito más tiempo', '#6B7280')}
        </td>
      </tr>
    </table>
  `

  return {
    subject: `Tu trial de 10 días termina hoy, ${adminName}`,
    html: layout(content),
  }
}

// Shared types, constants and utilities for the Soporte module.
// No 'use server' — safe to import from both server actions and client components.

export type TicketEstado    = 'ABIERTO' | 'EN_PROGRESO' | 'CERRADO'
export type TicketCriticidad = 'BAJA' | 'MEDIA' | 'ALTA'
export type RespuestaTipo   = 'COMENTARIO' | 'CAMBIO_ESTADO' | 'RESOLUCION' | 'SISTEMA'

export const SECCIONES_SOPORTE = [
    'PLANIFICACION',
    'INFORMES',
    'FORMATOS',
    'EPP',
    'MAQUINARIA',
    'COTIZACIONES',
    'VENTAS',
    'COMPRAS',
    'USUARIOS',
    'CONFIGURACION',
    'SOPORTE',
    'GENERAL',
] as const
export type SeccionSoporte = (typeof SECCIONES_SOPORTE)[number]

export const SECCION_LABELS: Record<SeccionSoporte, string> = {
    PLANIFICACION: 'Planificación',
    INFORMES:      'Informes',
    FORMATOS:      'Formatos',
    EPP:           'Gestión EPP',
    MAQUINARIA:    'Maquinaria',
    COTIZACIONES:  'Cotizaciones',
    VENTAS:        'Ventas',
    COMPRAS:       'Compras',
    USUARIOS:      'Usuarios',
    CONFIGURACION: 'Configuración',
    SOPORTE:       'Soporte',
    GENERAL:       'General',
}

export type TicketSoporte = {
    id:                        string
    numero:                    number
    tenant_id:                 string
    user_id:                   string
    sistema:                   string
    seccion:                   SeccionSoporte
    descripcion:               string
    criticidad:                TicketCriticidad
    estado:                    TicketEstado
    imagenes_problema:         string[]
    explicacion_no_tecnica:    string | null
    como_se_previene:          string | null
    imagenes_replica_dev:      string[]
    imagenes_pruebas_exitosas: string[]
    cerrado_at:                string | null
    cerrado_por_id:            string | null
    created_at:                string
    updated_at:                string
    reporter_nombre:           string | null
    tenant_nombre:             string | null
}

export type TicketRespuesta = {
    id:            string
    ticket_id:     string
    tenant_id:     string
    user_id:       string | null
    mensaje:       string
    tipo:          RespuestaTipo
    estado_nuevo:  string | null
    imagenes:      string[]
    es_de_soporte: boolean
    created_at:    string
    reporter_nombre: string | null
}

export function slugifyTenantName(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
}

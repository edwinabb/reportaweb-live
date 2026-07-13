export type InspeccionEstado = 'COMPLETADO' | 'EN_PROCESO' | 'RECHAZADO' | 'APROBADO'
// 'SI'/'NO'/'NO_APLICA' = valores v2 (nuevos). 'OK'/'FALLA' = legado Bubble (solo lectura).
export type InspeccionDetalleEstado = 'SI' | 'NO' | 'NO_APLICA' | 'OK' | 'FALLA'
export type Prioridad = 'ALTA' | 'MEDIA' | 'BAJA' | 'CRITICA'
export type PlanAccionEstado = 'PENDIENTE' | 'EN_PROCESO' | 'REVISION' | 'CERRADO' | 'VERIFICADO'

export interface Inspeccion {
    id: string
    tenant_id: string
    created_at: string
    updated_at: string
    created_by: string

    codigo_interno: string
    maquinaria_id: string
    conductor_id?: string
    supervisor_id?: string
    tarea_id?: string

    horometro_actual?: number
    kilometraje_actual?: number
    nivel_tanque_gasolina?: number // 0-100
    fecha_inspeccion: string // YYYY-MM-DD

    plantilla_id?: string

    estado: InspeccionEstado
    tiene_fallas: boolean
    ubicacion_gps?: {
        lat: number
        lng: number
        accuracy?: number
        address?: string
    }

    firma_conductor_url?: string
    firma_supervisor_url?: string

    puntaje?: number | null
    observaciones?: string | null

    is_active: boolean

    // Relations
    maquinaria?: any // Will be replaced with Maquinaria type
    plantilla?: Plantilla
    conductor?: any // User profile
    supervisor?: any // User profile
}

// ... (previous types remain)

export interface OpcionRespuesta {
    id: string
    tenant_id?: string | null
    name: string
    values: string[] | { label: string, color?: string }[]
    is_active: boolean
}

export interface PlantillaItem {
    text: string
    opcion_respuesta_id?: string // ID from options_sets table
}

export interface Plantilla {
    id: string
    tenant_id: string
    created_at: string
    nombre: string
    descripcion: string
    estructura: {
        category: string
        items: PlantillaItem[] // Changed from string[] to object array
    }[]
    is_active: boolean
}

// ... (rest of the file)

export interface InspeccionDetalle {
    id: string
    tenant_id: string
    created_at: string
    inspeccion_id: string

    categoria: string
    item: string
    orden: number

    estado: InspeccionDetalleEstado

    // Snapshot of the options used at the time of inspection
    opciones_respuesta?: string[]

    prioridad?: Prioridad
    comentario?: string
    foto_url?: string
}

// ...


export interface PreguntaRef {
    bubble_pregunta_id?: string
    titulo?: string
}

export interface PlanAccionResponsable {
    plan_id: string
    profile_id: string
    tenant_id: string
    profile?: {
        id: string
        first_name: string | null
        last_name: string | null
        email: string | null
    }
}

export interface PlanAccionAvance {
    id: string
    plan_id: string
    tenant_id: string
    estado: string | null
    comentario: string | null
    fotos: string[] | null
    created_at: string | null
    created_by: string | null
}

export interface PlanAccion {
    id: string
    tenant_id: string
    created_at: string | null
    updated_at: string | null
    created_by: string | null

    codigo: string | null
    bubble_id: string | null
    informe_bubble_id: string | null

    // Links (desde Fase 0)
    inspeccion_id: string | null
    inspeccion_detalle_id: string | null
    reporte_maquinaria_id: string | null
    plantilla_id: string | null
    maquinaria_id: string | null

    // Contenido
    titulo: string | null
    descripcion_problema: string | null
    accion_correctiva_propuesta: string | null
    pregunta_ref: PreguntaRef | null
    lista_fotos: string[] | null

    origen: string | null

    // Asignación / prioridad
    responsable_id: string | null // legacy — usar planes_accion_responsables
    fecha_limite: string | null
    prioridad: Prioridad | null
    estado: PlanAccionEstado | null

    // Cierre
    evidencia_cierre_url: string | null
    comentario_cierre: string | null
    fecha_cierre: string | null

    is_active: boolean | null

    // Relations (cuando se hace select con joins)
    maquinaria?: {
        id: string
        nombre: string | null
        modelo: string | null
        codigo_interno: string | null
    } | null
    plantilla?: {
        id: string
        nombre: string | null
    } | null
    responsables?: PlanAccionResponsable[]
}

export interface InspeccionWithRelations extends Inspeccion {
    detalles?: InspeccionDetalle[]
    planes_accion?: PlanAccion[]
}

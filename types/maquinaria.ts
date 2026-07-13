export type MaquinariaPropietario = 'propio' | 'tercero'
export type MaquinariaEstado = 'operativo' | 'mantenimiento' | 'inactivo'

export interface Maquinaria {
    id: string
    tenant_id: string
    codigo_interno?: string
    nombre: string
    categoria?: string
    marca?: string
    modelo?: string
    placa?: string
    capacidad?: string
    anio_fabricacion?: number
    propietario: MaquinariaPropietario
    proveedor_id?: string // UUID of the Tercero if proprietary='tercero'
    modelo_id?: string // Link to normalized model
    estado: MaquinariaEstado
    foto_url?: string
    is_active: boolean
    created_at?: string
    updated_at?: string
    // Joined fields
    modelo_ref?: MaquinariaModelo
}

export type DocAplicaA = 'vehiculo' | 'maquinaria' | 'todos'
export type DocCategoria = 'seguro' | 'con_vencimiento' | 'sin_vencimiento'

export interface MaquinariaTipoDoc {
    id: string
    tenant_id: string
    nombre: string
    aplica_a: DocAplicaA
    categoria: DocCategoria
    requiere_vencimiento: boolean
    dias_alerta: number
    // New fields
    es_obligatorio: boolean
    categoria_equipo?: string | null
    modelo_id?: string | null
    is_active: boolean
    // Joined
    modelo_ref?: {
        modelo: string
        marca: string
    }
}


export interface MaquinariaDocumento {
    id: string
    maquinaria_id: string
    tipo_doc_id: string
    tenant_id: string
    numero_doc?: string
    fecha_emision?: string // Date string
    fecha_vencimiento?: string // Date string
    archivo_url?: string
    estado?: string // VIGENTE, etc.
    is_active: boolean
    // Joined
    tipo_doc?: {
        nombre: string
    }
}

export interface MaquinariaModelo {
    id: string
    tenant_id: string
    tipo_equipo: string
    marca: string
    modelo: string
    capacidad?: string
    is_active: boolean
}

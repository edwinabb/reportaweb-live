// Types for Cotizaciones Module - Updated with 3-Price Structure
export interface ActionResponse {
    message: string
    success?: boolean
    id?: string
    cotizacion_id?: string
    new_id?: string
    token?: string
    pin?: string
    estado?: string
}

export type Moneda = 'PEN' | 'USD'

export type CotizacionEstado =
    | 'BORRADOR'
    | 'ENVIADA'
    | 'APROBADA'
    | 'RECHAZADA'
    | 'VENCIDA'
    | 'APLAZADA'

export type EstadoAprobacion = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA'

export type ServicioCategoria =
    | 'ALQUILER'
    | 'SERVICIO'
    | 'PRODUCTO'
    | 'APOYO LOGISTICO'

export type PeriodoUnidad =
    | 'DIA'
    | 'MES'

export type HistorialAccion =
    | 'CREADA'
    | 'MODIFICADA'
    | 'ENVIADA'
    | 'APROBADA'
    | 'RECHAZADA'
    | 'NUEVA_VERSION'

export type Responsable = 'EMPRESA' | 'CLIENTE' | 'AMBOS'

// ...

export interface MatrizResponsabilidad {
    id: string
    cotizacion_id: string
    tenant_id: string
    actividad: string
    actividad_id?: string // Link to catalog
    responsable: Responsable
    orden: number
    descripcion?: string // Added previously via script, now in types
    created_at: string
    created_by: string
}

// ...

export interface ActividadMatriz {
    id: string
    tenant_id: string
    nombre: string
    descripcion?: string
    responsable_default: Responsable | null
    orden: number
    is_active: boolean
    created_at: string
    created_by: string
}

export interface ActividadRow {
    actividad_id?: string // Link to catalog
    actividad: string
    descripcion?: string
    responsable: Responsable
    orden: number
}
export interface TipoPrecio {
    id: string
    nombre: string
    requiere_campo_adicional: boolean
    nombre_campo_adicional?: string
    orden: number
    is_active: boolean
    created_at: string
}

// ============================================
// TASA DE CAMBIO
// ============================================
export interface TasaCambio {
    id: string
    tenant_id: string
    moneda_origen: Moneda
    moneda_destino: Moneda
    tasa: number
    fecha_vigencia: string
    is_active: boolean
    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
}

// ============================================
// SERVICIO (Actualizado con 3 precios)
// ============================================
export interface ServicioPrecio {
    tipo: string
    valor: number
    campo_adicional?: number
    no_aplica?: boolean
}

export interface Servicio {
    id: string
    tenant_id: string
    codigo: string
    nombre: string
    descripcion?: string | null
    tipo_servicio: ServicioCategoria
    toneladas?: string | null
    moneda: Moneda
    cantidad_precios: number
    imagen_url?: string | null

    // PRECIO 1
    precio_1_tipo?: string | null
    precio_1_tipo_nombre?: string | null
    precio_1_valor?: number | null
    precio_1_campo_adicional?: number | null

    // PRECIO 2
    precio_2_tipo?: string | null
    precio_2_tipo_nombre?: string | null
    precio_2_valor?: number | null
    precio_2_campo_adicional?: number | null

    // PRECIO 3
    precio_3_tipo?: string | null
    precio_3_tipo_nombre?: string | null
    precio_3_valor?: number | null
    precio_3_campo_adicional?: number | null
    precio_3_no_aplica?: boolean | null

    is_active: boolean
    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
}

// Helper para obtener precios de un servicio
export interface ServicioWithPrecios extends Servicio {
    precios: ServicioPrecio[]
}

// ============================================
// COTIZACION (Actualizado con workflow de 5 pasos)
// ============================================
export interface Cotizacion {
    id: string
    tenant_id: string
    numero: string
    version: number
    cotizacion_padre_id?: string

    // Paso 1: Info General
    cliente_id: string
    contacto_id?: string
    sitio_id?: string
    fecha_emision: string
    fecha_inicio_estimada?: string
    periodo: number
    periodo_unidad: PeriodoUnidad
    forma_pago: string
    moneda: Moneda
    plazo_pago: string
    descripcion_requerimiento?: string
    fecha_vencimiento?: string
    dias_validez?: number

    // Paso 4: PDF
    pdf_url?: string
    pdf_generado_at?: string
    notas_precios?: string
    pdf_config?: CotizacionPDFConfig

    // Paso 5: Aprobación
    estado: CotizacionEstado
    comentarios_cliente?: string
    fecha_aprobacion?: string
    aprobado_por?: string

    // Tasa de cambio
    tasa_cambio_id?: string

    // Totales
    subtotal: number
    igv: number
    total: number

    // Aprobación legacy (mantener por compatibilidad)
    token_aprobacion?: string
    pin_aprobacion?: string
    fecha_envio?: string
    observaciones_cliente?: string
    tarea_id?: string
    notas_internas?: string
    terminos_condiciones?: string

    is_active: boolean
    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
}

// Cotizacion with relations
export interface CotizacionWithRelations extends Cotizacion {
    cliente?: {
        razon_social: string
        ruc?: string
    }
    contacto?: {
        nombre_completo: string
        email?: string
    }
    sitio?: {
        nombre: string
        direccion?: string
    }
    tasa_cambio?: TasaCambio
    detalles?: CotizacionDetalle[]
    matriz_responsabilidad?: MatrizResponsabilidad[]
    historial?: CotizacionHistorial[]
}

// ============================================
// COTIZACION DETALLE (Actualizado)
// ============================================
export interface CotizacionDetalle {
    id: string
    cotizacion_id: string
    tenant_id: string
    orden: number
    servicio_id?: string
    cantidad: number

    // Precio seleccionado (1, 2, o 3)
    precio_seleccionado?: number
    precio_tipo?: string
    precio_valor?: number
    precio_campo_adicional?: number

    // Aprobación individual
    estado_aprobacion: EstadoAprobacion
    tarea_id?: string | null
    precio_negociado?: number | null

    created_at: string
    created_by: string
}

// Cotizacion Detalle with relations
export interface CotizacionDetalleWithRelations extends CotizacionDetalle {
    servicio?: Servicio
}

// ============================================
// MATRIZ RESPONSABILIDAD
// ============================================
export interface MatrizResponsabilidad {
    id: string
    cotizacion_id: string
    tenant_id: string
    actividad: string
    responsable: Responsable
    orden: number
    created_at: string
    created_by: string
}

// ============================================
// OFERTAS PROVEEDORES
// ============================================
export interface OfertaProveedor {
    id: string
    cotizacion_id: string
    servicio_id: string
    tenant_id: string
    proveedor_nombre: string // Keep for legacy/fallback
    precio: number
    observaciones?: string

    // New Fields
    id_oferta_manual?: string
    fecha_oferta?: string
    proveedor_id?: string
    contacto_id?: string
    moneda?: string
    forma_pago?: string
    plazo_pago?: string
    fecha_inicio_preliminar?: string
    fecha_solicitud?: string
    sitio_texto?: string
    descripcion_requerimiento?: string

    created_at: string
    created_by: string
}

// ============================================
// HISTORICAL DATA
// ============================================
export interface HistoricalClientQuote {
    cotizacion: {
        id: string
        numero: string
        codigo?: string
        fecha_emision?: string
        cliente: {
            razon_social: string
        } | null
    }
    created_at?: string
    precio_valor: number
    precio_tipo?: string
    moneda?: string
}

export interface HistoricalSupplierOffer {
    fecha_oferta: string
    proveedor_nombre: string
    precio: number
    moneda?: string
}

export interface CotizacionOfertaItem {
    id: string
    cotizacion_oferta_id: string
    tenant_id: string
    servicio_id?: string
    cantidad: number
    precio_monto: number
    descripcion?: string

    // Multi-price fields
    precio_1_valor?: number
    precio_1_campo_adicional?: number
    precio_2_valor?: number
    precio_2_campo_adicional?: number
    precio_3_valor?: number
    precio_3_campo_adicional?: number

    created_at: string
    created_by: string
}

export interface CotizacionOpcion {
    id: string
    tenant_id: string
    categoria: string
    texto: string
    valor?: string
    activo: boolean
    is_default: boolean
}

// ============================================
// ACTIVIDADES MATRIZ (Catálogo)
// ============================================
export interface ActividadMatriz {
    id: string
    tenant_id: string
    nombre: string
    descripcion?: string
    responsable_default: Responsable | null
    orden: number
    is_active: boolean
    created_at: string
    created_by: string
}

export interface ActividadRow {
    actividad: string
    descripcion?: string
    responsable: Responsable
    orden: number
}

// ============================================
// COTIZACION HISTORIAL
// ============================================
export interface CotizacionHistorial {
    id: string
    cotizacion_id: string
    tenant_id: string
    accion: HistorialAccion
    estado_anterior?: string
    estado_nuevo?: string
    usuario_id?: string
    usuario_email?: string
    observacion?: string
    metadata?: any
    created_at: string
}

// ============================================
// FORM DATA TYPES
// ============================================
export interface TasaCambioFormData {
    moneda_origen: Moneda
    moneda_destino: Moneda
    tasa: number
    fecha_vigencia: string
}

export interface ServicioFormData {
    codigo: string
    nombre: string
    tipo_servicio: ServicioCategoria
    toneladas?: string
    moneda: Moneda
    cantidad_precios: number
    imagen_url?: string

    // Precios dinámicos
    precio_1_tipo?: string
    precio_1_valor?: number
    precio_1_campo_adicional?: number

    precio_2_tipo?: string
    precio_2_valor?: number
    precio_2_campo_adicional?: number

    precio_3_tipo?: string
    precio_3_valor?: number
    precio_3_campo_adicional?: number
    precio_3_no_aplica?: boolean
}

export interface CotizacionPaso1FormData {
    cliente_id: string
    contacto_id?: string
    sitio_id?: string
    fecha_emision: string
    fecha_inicio_estimada?: string
    periodo: number
    periodo_unidad: PeriodoUnidad
    forma_pago: string
    moneda: Moneda
    plazo_pago: string
    descripcion_requerimiento?: string
}

export interface CotizacionDetalleFormData {
    servicio_id: string
    cantidad: number
    precio_seleccionado: number
}

export interface MatrizResponsabilidadFormData {
    actividad: string
    responsable: Responsable
}

export interface OfertaProveedorFormData {
    servicio_id: string
    precio: number

    // Updated Form Fields
    proveedor_id?: string
    proveedor_nombre?: string // Fallback
    contacto_id?: string
    id_oferta_manual?: string
    fecha_oferta?: string
    moneda?: string
    forma_pago?: string
    plazo_pago?: string
    fecha_inicio_preliminar?: string
    fecha_solicitud?: string
    sitio_texto?: string
    descripcion_requerimiento?: string
    observaciones?: string

    // [NEW FIELDS] Multi-price inputs
    cantidad?: number
    precio_1_valor?: number
    precio_1_campo_adicional?: number
    precio_2_valor?: number
    precio_2_campo_adicional?: number
    precio_3_valor?: number
    precio_3_campo_adicional?: number
}

// ============================================
// UTILITY TYPES
// ============================================
export interface CotizacionTotales {
    subtotal: number
    igv: number
    total: number
}

export interface AprobacionData {
    token: string
    pin: string
    email: string
    observaciones?: string
}

// Workflow steps
export type CotizacionPaso = 1 | 2 | 3 | 4 | 5

export interface CotizacionWorkflowState {
    paso_actual: CotizacionPaso
    paso_1_completo: boolean
    paso_2_completo: boolean
    paso_3_completo: boolean
    paso_4_completo: boolean
    paso_5_completo: boolean
}

export interface CotizacionPDFConfig {
    saludo?: string
    forma_pago1?: string
    forma_pago2?: string
    banco?: string
    despedida?: string
    mostrar_firma?: boolean

    // New Visual Reference Fields
    texto_introduccion?: string
    texto_notas_precios?: string
    texto_aceptacion?: string
    texto_forma_pago_1?: string
    texto_forma_pago_2?: string
    imagen_banco_url?: string
    firma_autorizada_usuario_id?: string
    firma_imagen_url?: string
}

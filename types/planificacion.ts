/**
 * Modelo de Planificación (3 tablas — ver migration 20260418170000):
 *
 *   tareas          → encabezado (cliente, sitio, cotización, título, prioridad)
 *   tareas_fechas   → intervalos de fechas (consecutivas o salteadas) por tarea
 *   tareas_recursos → recursos asignados a cada intervalo
 */

export interface Tarea {
    id: string
    tenant_id: string
    created_at: string
    created_by: string | null
    codigo: string | null
    titulo: string
    descripcion: string | null
    cliente_id: string | null
    cliente_nombre: string | null
    sitio: string | null
    cotizacion_id: string | null
    cotizacion_item_id: string | null
    cotizacion_ref: string | null
    prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | null
    estado: 'BORRADOR' | 'CONFIRMADA' | 'COMPLETADA' | 'CANCELADA' | null
    tipo_tarea: 'MANTENIMIENTO' | 'MERCADEO' | 'OPERACIONES' | 'PERSONAL' | 'PROYECTOS' | 'SST' | 'STAND BY' | 'TURNOS' | 'VACACIONES' | 'VENTAS' | null
    servicio_ref: string | null
    contacto_id: string | null
    is_active: boolean
    hora_inicio: string | null
    hora_fin: string | null
    // Campos denormalizados desde mv_planificacion_diaria (null en otras rutas)
    cotizacion_cod: string | null
    autor_nombre: string | null
    personal_nombres: string[] | null
}

/**
 * Un intervalo de fechas. Cada tarea puede tener N intervalos.
 *
 * Modo consecutivo: `fecha_inicio` + `fecha_fin` (ambos inclusive).
 * Modo salteado:    `fechas_multiples` = DATE[] (días no consecutivos).
 *
 * Constraint DB: al menos uno de los dos modos tiene que estar presente.
 */
export interface TareaFecha {
    id: string
    tenant_id: string
    tarea_id: string
    fecha_inicio: string | null // YYYY-MM-DD
    fecha_fin: string | null // YYYY-MM-DD
    fechas_multiples: string[] | null // YYYY-MM-DD[]
    notas: string | null
    is_active: boolean
    created_at: string | null
    updated_at: string
}

/**
 * Input para crear un intervalo desde UI/factory. `tarea_id` lo setea el caller.
 */
export interface TareaFechaInput {
    fecha_inicio?: string | null
    fecha_fin?: string | null
    fechas_multiples?: string[] | null
    notas?: string | null
}

export interface TareaRecurso {
    id: string
    tenant_id: string
    tarea_id: string | null
    tarea_fecha_id: string | null
    tipo_recurso: 'PERSONAL' | 'MAQUINARIA'
    personal_id: string | null
    maquinaria_id: string | null
    recurso_externo_nombre: string | null
    proveedor_id: string | null
    is_active: boolean | null
    created_at: string | null
    created_by: string | null
}

/**
 * Input para asignar un recurso a un intervalo (`tarea_fecha_id` lo resuelve el caller
 * después de crear el intervalo).
 */
export interface TareaRecursoInput {
    tipo_recurso: 'PERSONAL' | 'MAQUINARIA'
    recurso_id: string // personal_id o maquinaria_id según tipo
    recurso_externo_nombre?: string | null
    proveedor_id?: string | null
}

/**
 * Payload para `createTarea` — una tarea con sus intervalos y, por cada intervalo,
 * sus recursos asignados.
 */
export interface CreateTareaPayload {
    header: Partial<Tarea>
    intervalos: Array<TareaFechaInput & { recursos: TareaRecursoInput[] }>
}

export interface TareaFechaWithRecursos extends TareaFecha {
    recursos: TareaRecurso[]
}

export interface TareaWithRelations extends Tarea {
    fechas: TareaFechaWithRecursos[]
    /**
     * Joined opcional — lo trae `getTareas` para que el buscador pueda filtrar
     * por "Solo con cotización aprobada" sin un segundo round-trip. No es
     * obligatorio; endpoints antiguos pueden devolver `undefined`.
     */
    cotizacion?: {
        id: string
        estado: string | null
        numero: string | null
        anio: number | null
    } | null
}

// -----------------------------------------------------------------------------
// Versión hidratada para el dialog de detalle — trae cliente/contacto/cotización
// joined + nombres de personal, maquinaria y proveedores. Usado solo por
// `getTareaWithDetails`; la versión flaca (`TareaWithRelations`) se mantiene
// para los listados y el wizard de edición.
// -----------------------------------------------------------------------------
export interface TareaRecursoWithNames extends TareaRecurso {
    personal: {
        id: string
        first_name: string | null
        last_name: string | null
        doc_number: string | null
    } | null
    maquinaria: {
        id: string
        nombre: string | null
        codigo_interno: string | null
        modelo: string | null
        placa: string | null
        marca: string | null
    } | null
    proveedor: { id: string; razon_social: string; ruc: string | null } | null
}

export interface TareaFechaWithRecursosDetallados extends TareaFecha {
    recursos: TareaRecursoWithNames[]
}

export interface TareaDetalle extends Tarea {
    cliente: {
        id: string
        razon_social: string
        ruc: string | null
        telefono: string | null
    } | null
    contacto: {
        id: string
        nombre_completo: string
        telefono: string | null
        email: string | null
        cargo: string | null
    } | null
    cotizacion: {
        id: string
        numero: string | null
        anio: number | null
        estado: string | null
        total: number | null
        moneda: string | null
        descripcion_requerimiento: string | null
    } | null
    fechas: TareaFechaWithRecursosDetallados[]
}

// -----------------------------------------------------------------------------
// Legacy — mantengo el alias `Asignacion` porque componentes viejos lo importan.
// Equivale a TareaRecurso.
// -----------------------------------------------------------------------------
export type Asignacion = TareaRecurso

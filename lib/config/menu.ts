import {
    FileText,
    TrendingUp,
    ShoppingCart,
    Users,
    Truck,
    UserCog,
    Settings,
    AlertTriangle,
    HardHat,
    Calendar,
    BookOpen,
    HelpCircle,
} from "lucide-react"

export type MenuItem = {
    name: string
    href?: string
    icon?: any
    children?: { name: string; href: string }[]
    sectionLabel?: string  // muestra etiqueta de sección con línea ANTES de este item
    recurso?: string       // ruta_base en sistema_recursos; undefined = siempre visible
}

export const menuItems: MenuItem[] = [

    // ── FINANZAS ──────────────────────────────────────────────
    {
        name: "Cotizaciones",
        icon: FileText,
        sectionLabel: "FINANZAS",
        recurso: '/cotizaciones',
        children: [
            { name: "Gestión", href: "/cotizaciones" },
            { name: "Servicios", href: "/cotizaciones/servicios" },
            { name: "Tasas", href: "/cotizaciones/tasas" },
        ]
    },
    {
        name: "Ventas",
        icon: TrendingUp,
        recurso: '/ventas',
        children: [
            { name: "Panel", href: "/ventas/panel" },
            { name: "Valoraciones", href: "/ventas/valoraciones" },
            { name: "Facturas", href: "/ventas/facturas" },
        ]
    },
    {
        name: "Compras",
        icon: ShoppingCart,
        recurso: '/compras',
        children: [
            { name: "Panel", href: "/compras/panel" },
            { name: "Valoraciones", href: "/compras/valoraciones" },
            { name: "Facturas", href: "/compras/facturas" },
        ]
    },

    // ── PLANIFICACION ─────────────────────────────────────────
    {
        name: "Planificación",
        icon: Calendar,
        sectionLabel: "PLANIFICACION",
        recurso: '/planificacion',
        children: [
            { name: "Panel", href: "/planificacion" },
            { name: "Registrar", href: "/planificacion/nueva" },
        ]
    },
    {
        name: "Informes",
        icon: BookOpen,
        recurso: '/informes',
        children: [
            { name: "R. Checklist", href: "/informes" },
            { name: "R. Maquinaria", href: "/informes/maquinaria" },
            { name: "R. Personal", href: "/informes/personal" },
            { name: "R. Gastos", href: "/informes/gastos" },
        ]
    },
    {
        name: "Planes de Acción",
        icon: AlertTriangle,
        recurso: '/planes-accion',
        children: [
            { name: "Panel", href: "/planes-accion/panel" },
            { name: "Listado", href: "/planes-accion" },
        ]
    },

    // ── OPERACIONES ───────────────────────────────────────────
    {
        name: "Terceros",
        icon: Users,
        sectionLabel: "OPERACIONES",
        recurso: '/terceros',
        children: [
            { name: "Directorio", href: "/terceros" },
            { name: "Contactos", href: "/terceros/contactos" },
            { name: "Personal", href: "/terceros/personal" },
            { name: "Sitios", href: "/terceros/sitios" },
        ]
    },
    {
        name: "Maquinaria",
        icon: Truck,
        recurso: '/maquinarias',
        children: [
            { name: "Equipos", href: "/maquinarias" },
            { name: "Modelos", href: "/maquinarias/modelos" },
            { name: "Tipos", href: "/maquinarias/types" },
            { name: "Documentos", href: "/maquinarias/documentos" },
        ]
    },
    {
        name: "Usuarios",
        icon: UserCog,
        recurso: '/users',
        children: [
            { name: "Directorio", href: "/users" },
            { name: "Documentación", href: "/users/documents" },
        ]
    },
    {
        name: "Gestión EPP",
        icon: HardHat,
        recurso: '/epp',
        children: [
            { name: "Dashboard", href: "/epp" },
            { name: "Catálogo", href: "/epp/catalogo" },
            { name: "Nueva entrega", href: "/epp/entrega/nueva" },
            { name: "Alertas", href: "/epp/alertas" },
            { name: "Reportes", href: "/epp/reportes" },
        ]
    },

    // ── SOPORTE ───────────────────────────────────────────────
    {
        name: "Soporte",
        icon: HelpCircle,
        href: "/soporte",
        sectionLabel: "SOPORTE",
    },

    // ── CONFIGURACION ─────────────────────────────────────────
    {
        name: "Configuración",
        icon: Settings,
        sectionLabel: "CONFIGURACION",
        recurso: '/settings',
        children: [
            { name: "Empresa", href: "/settings/empresa" },
            { name: "Usuarios", href: "/settings/users" },
            { name: "Terceros", href: "/settings/terceros" },
            { name: "Maquinaria", href: "/settings/maquinaria" },
            { name: "Cotizaciones", href: "/settings/cotizaciones" },
            { name: "Informes", href: "/settings/informes" },
            { name: "Valorizaciones", href: "/settings/valorizaciones" },
            { name: "Sitios", href: "/settings/sitios" },
            { name: "Tipos de Documento", href: "/settings/document-types" },
            { name: "Notificaciones", href: "/configuracion/notificaciones" },
        ]
    },

]

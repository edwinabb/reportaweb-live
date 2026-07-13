'use server'

import { createConfigItem, deleteConfigItem, restoreConfigItem, updateConfigItem } from "./cotizaciones-config"

export async function createFormaPagoAction(nombre: string) {
    if (!nombre) return { success: false, message: 'El nombre es requerido' }
    return createConfigItem('formas_pago', nombre)
}

export async function updateFormaPagoAction(id: string, nombre: string) {
    return updateConfigItem('formas_pago', id, nombre)
}

export async function deleteFormaPagoAction(id: string) {
    return deleteConfigItem('formas_pago', id)
}

export async function restoreFormaPagoAction(id: string) {
    return restoreConfigItem('formas_pago', id)
}

export async function createPlazoPagoAction(nombre: string) {
    if (!nombre) return { success: false, message: 'El nombre es requerido' }
    return createConfigItem('plazos_pago', nombre)
}

export async function updatePlazoPagoAction(id: string, nombre: string) {
    return updateConfigItem('plazos_pago', id, nombre)
}

export async function deletePlazoPagoAction(id: string) {
    return deleteConfigItem('plazos_pago', id)
}

export async function restorePlazoPagoAction(id: string) {
    return restoreConfigItem('plazos_pago', id)
}

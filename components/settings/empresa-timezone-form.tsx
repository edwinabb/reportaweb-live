"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { updateTimezone } from "@/lib/actions/empresa-config"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

type TZOption = { value: string; label: string }
type TZGroup = { group: string; options: TZOption[] }

const TIMEZONE_GROUPS: TZGroup[] = [
    {
        group: "México y Centroamérica",
        options: [
            { value: "America/Mexico_City",  label: "México — Ciudad de México (UTC−6/−5)" },
            { value: "America/Cancun",        label: "México — Quintana Roo (UTC−5, sin cambio)" },
            { value: "America/Chihuahua",     label: "México — Chihuahua (UTC−7/−6)" },
            { value: "America/Tijuana",       label: "México — Baja California (UTC−8/−7)" },
            { value: "America/Belize",        label: "Belice (UTC−6)" },
            { value: "America/Guatemala",     label: "Guatemala (UTC−6)" },
            { value: "America/El_Salvador",   label: "El Salvador (UTC−6)" },
            { value: "America/Tegucigalpa",   label: "Honduras (UTC−6)" },
            { value: "America/Managua",       label: "Nicaragua (UTC−6)" },
            { value: "America/Costa_Rica",    label: "Costa Rica (UTC−6)" },
            { value: "America/Panama",        label: "Panamá (UTC−5)" },
        ],
    },
    {
        group: "Caribe",
        options: [
            { value: "America/Havana",        label: "Cuba (UTC−5/−4)" },
            { value: "America/Jamaica",       label: "Jamaica (UTC−5)" },
            { value: "America/Santo_Domingo", label: "República Dominicana (UTC−4)" },
            { value: "America/Puerto_Rico",   label: "Puerto Rico (UTC−4)" },
        ],
    },
    {
        group: "Sudamérica del Norte",
        options: [
            { value: "America/Bogota",        label: "Colombia (UTC−5)" },
            { value: "America/Lima",          label: "Perú (UTC−5)" },
            { value: "America/Guayaquil",     label: "Ecuador (UTC−5)" },
            { value: "America/Caracas",       label: "Venezuela (UTC−4)" },
            { value: "America/Guyana",        label: "Guyana (UTC−4)" },
            { value: "America/Paramaribo",    label: "Surinam (UTC−3)" },
        ],
    },
    {
        group: "Sudamérica del Sur",
        options: [
            { value: "America/La_Paz",        label: "Bolivia (UTC−4)" },
            { value: "America/Asuncion",      label: "Paraguay (UTC−4/−3)" },
            { value: "America/Santiago",      label: "Chile (UTC−4/−3)" },
            { value: "America/Argentina/Buenos_Aires", label: "Argentina — Buenos Aires (UTC−3)" },
            { value: "America/Argentina/Cordoba",      label: "Argentina — Córdoba (UTC−3)" },
            { value: "America/Argentina/Mendoza",      label: "Argentina — Mendoza (UTC−3)" },
            { value: "America/Montevideo",    label: "Uruguay (UTC−3)" },
        ],
    },
    {
        group: "Brasil",
        options: [
            { value: "America/Sao_Paulo",     label: "Brasil — São Paulo (UTC−3/−2)" },
            { value: "America/Fortaleza",     label: "Brasil — Fortaleza / Nordeste (UTC−3)" },
            { value: "America/Recife",        label: "Brasil — Recife (UTC−3)" },
            { value: "America/Belem",         label: "Brasil — Belém (UTC−3)" },
            { value: "America/Manaus",        label: "Brasil — Manaus (UTC−4)" },
            { value: "America/Porto_Velho",   label: "Brasil — Porto Velho (UTC−4)" },
            { value: "America/Boa_Vista",     label: "Brasil — Boa Vista (UTC−4)" },
            { value: "America/Rio_Branco",    label: "Brasil — Rio Branco (UTC−5)" },
        ],
    },
]

interface Props {
    initialTimezone: string
}

export function EmpresaTimezoneForm({ initialTimezone }: Props) {
    const [timezone, setTimezone] = useState(initialTimezone)
    const [isPending, startTransition] = useTransition()

    const handleSave = () => {
        startTransition(async () => {
            const res = await updateTimezone(timezone)
            if (res.success) toast.success(res.message)
            else toast.error(res.message)
        })
    }

    const allOptions = TIMEZONE_GROUPS.flatMap(g => g.options)
    const current = allOptions.find(o => o.value === timezone)

    return (
        <div className="space-y-6">
            <div className="space-y-2 max-w-sm">
                <Label htmlFor="timezone-select">Zona horaria</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger id="timezone-select" className="w-full">
                        <SelectValue>
                            {current?.label ?? timezone}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                        {TIMEZONE_GROUPS.map((group) => (
                            <SelectGroup key={group.group}>
                                <SelectLabel>{group.group}</SelectLabel>
                                {group.options.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                    Identificador IANA: <code className="font-mono bg-muted px-1 rounded">{timezone}</code>
                </p>
            </div>

            <Button onClick={handleSave} disabled={isPending || timezone === initialTimezone}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar cambios
            </Button>
        </div>
    )
}

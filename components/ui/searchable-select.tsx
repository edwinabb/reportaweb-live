"use client"

import { useState, useRef, useEffect } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Button } from "./button"
import { Input } from "./input"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SearchableOption {
    value: string
    label: string
}

interface SearchableSelectProps {
    options: SearchableOption[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
    searchPlaceholder?: string
    disabled?: boolean
    emptyText?: string
    className?: string
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Seleccionar...",
    searchPlaceholder = "Buscar...",
    disabled,
    emptyText = "Sin resultados",
    className,
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)

    const filtered = query
        ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
        : options

    const selected = options.find(o => o.value === value)

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 0)
        } else {
            setQuery("")
        }
    }, [open])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        "w-full justify-between font-normal bg-white border-input h-9 px-3",
                        !selected && "text-muted-foreground",
                        className
                    )}
                >
                    <span className="truncate">{selected ? selected.label : placeholder}</span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="p-0 w-[--radix-popover-trigger-width] min-w-[200px]"
                align="start"
                sideOffset={4}
            >
                <div className="border-b p-2">
                    <Input
                        ref={inputRef}
                        placeholder={searchPlaceholder}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="h-8 text-sm"
                    />
                </div>
                <div className="max-h-[220px] overflow-y-auto py-1">
                    {filtered.length === 0 ? (
                        <p className="py-2 px-3 text-xs text-muted-foreground">{emptyText}</p>
                    ) : (
                        filtered.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                className={cn(
                                    "w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-accent",
                                    opt.value === value && "bg-accent/40"
                                )}
                                onClick={() => {
                                    onChange(opt.value)
                                    setOpen(false)
                                }}
                            >
                                <Check className={cn("h-3.5 w-3.5 text-orange-600 shrink-0", opt.value !== value && "invisible")} />
                                {opt.label}
                            </button>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}

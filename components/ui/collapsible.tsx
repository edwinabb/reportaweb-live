"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const CollapsibleContext = React.createContext<{
    open: boolean
    onOpenChange: (open: boolean) => void
}>({
    open: false,
    onOpenChange: () => { },
})

interface CollapsibleProps extends React.HTMLAttributes<HTMLDivElement> {
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
}

const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(
    ({ className, open: openProp, defaultOpen, onOpenChange: onOpenChangeProp, children, ...props }, ref) => {
        const [openState, setOpenState] = React.useState(defaultOpen || false)

        const open = openProp !== undefined ? openProp : openState
        const onOpenChange = onOpenChangeProp || setOpenState

        return (
            <CollapsibleContext.Provider value={{ open, onOpenChange }}>
                <div ref={ref} className={cn(className)} {...props}>
                    {children}
                </div>
            </CollapsibleContext.Provider>
        )
    }
)
Collapsible.displayName = "Collapsible"

interface CollapsibleTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean
}

const CollapsibleTrigger = React.forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
    ({ className, children, asChild, onClick, ...props }, ref) => {
        const { open, onOpenChange } = React.useContext(CollapsibleContext)

        const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
            onOpenChange(!open)
            onClick?.(e)
        }

        if (asChild) {
            // Simple slot-like behavior: clone the single child and add onClick
            const child = React.Children.only(children) as React.ReactElement
            return React.cloneElement(child, {
                // @ts-ignore
                onClick: (e) => {
                    handleClick(e)
                    // @ts-ignore
                    child.props.onClick?.(e)
                },
                // @ts-ignore
                ref,
                "data-state": open ? "open" : "closed"
            })
        }

        return (
            <button
                ref={ref}
                type="button"
                onClick={handleClick}
                className={cn(className)}
                data-state={open ? "open" : "closed"}
                {...props}
            >
                {children}
            </button>
        )
    }
)
CollapsibleTrigger.displayName = "CollapsibleTrigger"

const CollapsibleContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, children, ...props }, ref) => {
        const { open } = React.useContext(CollapsibleContext)

        if (!open) return null

        return (
            <div
                ref={ref}
                className={cn("overflow-hidden animate-in slide-in-from-top-1", className)}
                {...props}
            >
                {children}
            </div>
        )
    }
)
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }

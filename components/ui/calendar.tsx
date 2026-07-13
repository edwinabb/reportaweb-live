"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-3", className)}
            classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                ),
                // Positioning arrows: standard edges relative to the narrower table
                nav_button_previous: "absolute right-8", // Move to right side next to other arrow?
                nav_button_next: "absolute right-0", // Right edge
                // User asked "Move arrows to right of month name" AND "Move arrows... to left". Conflicting.
                // Given the request "Mueva las flechas y los dias a la zquierda", keeping arrows standard spread on the narrow table is safest?
                // Or putting them both right?
                // Let's stick to arrows on the RIGHT side of the header if title is LEFT.
                // Reverting prev/next positions below to be on the right side stack.

                // Correct v9 mapping
                table: "w-auto border-collapse space-y-1", // Changed w-full to w-auto to prevent spreading
                head_row: "flex", // Keep flex for head row to distribute? No, table-row is safer. Let's try native table.
                head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]", // Reduced to w-8
                row: "flex w-full mt-2", // The issue was TD having inline-flex. If TR is flex, TD must be block? 
                // Actually, let's go STRICT table.

                // TABLE OVERRIDES
                root: "w-max", // Ensure root fits content
                month_grid: "w-auto border-collapse space-y-1", // v9 uses month_grid
                weekdays: "flex", // v9 head row
                weekday: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]", // Reduced to w-8
                week: "flex w-full mt-2", // v9 body row

                // CELLS (day is the cell in v9?) Inspection said 'td' has 'day' class.
                cell: "h-8 w-8 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20", // Reduced to h-8 w-8
                day: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-8 w-8 p-0 font-normal aria-selected:opacity-100" // Reduced to h-8 w-8
                ),

                // Interactive states
                range_end: "day-range-end",
                selected:
                    "bg-orange-600 text-white hover:bg-orange-600 focus:bg-orange-600",
                today: "bg-accent text-accent-foreground",
                outside:
                    "day-outside text-muted-foreground opacity-50 aria-selected:bg-orange-600 aria-selected:text-white aria-selected:opacity-100",
                disabled: "text-muted-foreground opacity-50",
                range_middle:
                    "aria-selected:bg-accent aria-selected:text-accent-foreground",
                hidden: "invisible",
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation }) => {
                    const Icon = orientation === "left" ? ChevronLeft : ChevronRight
                    return <Icon className="h-4 w-4" />
                },
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }

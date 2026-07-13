
import { UserProvider } from "@/contexts/user-context"
import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { SentryRouteContext } from "@/components/sentry-route-context"

export const dynamic = 'force-dynamic'

const IS_TEST_SERVER = process.env.NEXT_PUBLIC_ENV !== 'production'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <UserProvider>
            <SentryRouteContext />
            {IS_TEST_SERVER && (
                <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-400 text-amber-900 text-center text-xs font-bold py-1 tracking-widest uppercase">
                    ⚠ SERVIDOR DE PRUEBAS — Los datos aquí NO son datos de producción ⚠
                </div>
            )}
            <div className={`flex min-h-screen w-full bg-muted/40${IS_TEST_SERVER ? ' pt-6' : ''}`}>
                <DashboardSidebar />
                <div className="flex flex-1 flex-col md:pl-52">
                    <DashboardHeader />
                    <main className="flex-1 p-4 md:p-8">
                        {children}
                    </main>
                </div>
            </div>
        </UserProvider>
    )
}

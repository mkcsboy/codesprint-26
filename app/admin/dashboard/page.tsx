import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminDashboard from './admin-client'

export default function AdminDashboardPage() {
    const cookieStore = cookies()
    const adminSession = cookieStore.get('admin_session')?.value

    if (adminSession !== 'authenticated') {
        redirect('/admin')
    }

    return <AdminDashboard />
}

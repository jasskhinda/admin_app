import AdminLayout from '../components/AdminLayout';

export default function DashboardLayout({ children }) {
    return (
        <AdminLayout>
            {children}
        </AdminLayout>
    );
}
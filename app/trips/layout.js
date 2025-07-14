import AdminLayout from '@/app/components/AdminLayout';

export default function TripsLayout({ children }) {
    return (
        <AdminLayout>
            {children}
        </AdminLayout>
    );
}
import AdminHeader from '../components/AdminHeader';

export default function DashboardLayout({ children }) {
    return (
        <div className="flex flex-col min-h-screen">
            <AdminHeader />
            <main className="flex-1 bg-white dark:bg-brand-background">
                {children}
            </main>
        </div>
    );
}
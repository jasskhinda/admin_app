import AdminHeader from '../components/AdminHeader';
import AdminFooter from '../components/AdminFooter';

export default function DashboardLayout({ children }) {
    return (
        <div className="flex flex-col min-h-screen">
            <AdminHeader />
            <main className="flex-1 bg-white dark:bg-brand-background">
                {children}
            </main>
            <AdminFooter />
        </div>
    );
}
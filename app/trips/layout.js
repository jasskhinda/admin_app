import AdminHeader from '@/app/components/AdminHeader';

export default function TripsLayout({ children }) {
    return (
        <div className="flex flex-col min-h-screen">
            <AdminHeader />
            <main className="flex-1 bg-background">
                {children}
            </main>
        </div>
    );
}
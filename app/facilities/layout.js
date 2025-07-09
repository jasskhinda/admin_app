import AdminHeader from '../components/AdminHeader';

export default function FacilitiesLayout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
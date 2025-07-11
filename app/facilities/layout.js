import AdminHeader from '../components/AdminHeader';

export default function FacilitiesLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader />
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
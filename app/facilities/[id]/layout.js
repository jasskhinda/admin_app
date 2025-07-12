import AdminHeader from '../../components/AdminHeader';

export default function FacilityDetailsLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader />
      <main className="flex-1 bg-gray-50">
        {children}
      </main>
    </div>
  );
}
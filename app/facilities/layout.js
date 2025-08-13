import AdminLayout from '../components/AdminLayout';

export default function FacilitiesLayout({ children }) {
  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        {children}
      </div>
    </AdminLayout>
  );
}
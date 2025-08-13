import Link from 'next/link';

export default function AdminFooter() {
  return (
    <footer className="bg-white py-6 border-t border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-600 text-sm">
            &copy; 2025 Compassionate Care Transportation. All rights reserved.
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <Link 
              href="#" 
              className="text-gray-600 text-sm hover:text-[#84CED3] transition-colors"
            >
              Help
            </Link>
            <Link 
              href="#" 
              className="text-gray-600 text-sm hover:text-[#84CED3] transition-colors"
            >
              Privacy
            </Link>
            <Link 
              href="#" 
              className="text-gray-600 text-sm hover:text-[#84CED3] transition-colors"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

const PublicLayout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <img src="/LiveCampus.svg" alt="LiveCampus Logo" className="h-6 w-6" />
                <span className="ml-2 text-lg font-medium text-primary-900">LiveCampus</span>
              </Link>
            </div>

            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/about" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                About
              </Link>
              <Link to="/features" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                Features
              </Link>
              <Link to="/contact" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                Contact
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => navigate('/login')}>
                Log in
              </Button>
              <Button onClick={() => navigate('/register')}>
                Sign up
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-blue-200 text-black border-t border-neutral-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <img src="/LiveCampus.svg" alt="LiveCampus Logo" className="h-10 w-10" />
              <span className="ml-2 text-lg font-medium text-primary-900">LiveCampus</span>
            </div>

            <div className="flex space-x-6">
              <Link to="/terms" className="text-black-500 hover:text-neutral-900 transition-colors">
                Terms
              </Link>
              <Link to="/privacy" className="text-black-500 hover:text-neutral-900 transition-colors">
                Privacy
              </Link>
              <Link to="/contact" className="text-black-500 hover:text-neutral-900 transition-colors">
                Support
              </Link>
            </div>

            <div className="mt-4 md:mt-0">
              <p className="text-black-500 text-sm">
                © 2025 LiveCampus. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;

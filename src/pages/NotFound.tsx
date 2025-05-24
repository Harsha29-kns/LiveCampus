import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-neutral-50">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <Calendar className="h-16 w-16 text-primary-500 mx-auto" />
          <h1 className="mt-6 text-4xl font-extrabold text-neutral-900">404</h1>
          <h2 className="mt-2 text-2xl font-bold text-neutral-800">Page Not Found</h2>
          <p className="mt-4 text-neutral-600">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="flex flex-col space-y-3">
          <Button 
            onClick={() => navigate('/')}
            leftIcon={<ArrowLeft size={16} />}
            fullWidth
          >
            Back to Dashboard
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => navigate('/events')}
            fullWidth
          >
            Browse Events
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
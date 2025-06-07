import React from 'react';

const Maintenance: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center text-white text-center px-4">
      <div className="max-w-xl">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-pulse">🚧 Under Maintenance</h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-8">
          We’re doing some work on the site to make it even better. Please check back soon!
        </p>
        <div className="text-gray-400">~ LiveCampus Team</div>
      </div>
    </div>
  );
};

export default Maintenance;

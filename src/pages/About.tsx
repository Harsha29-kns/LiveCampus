import React from 'react';

const About: React.FC = () => (
  <div className="max-w-xl mx-auto py-12">
    <h1 className="text-2xl font-bold mb-4">About Us</h1>
    <p className="text-neutral-700 mb-4">
      Welcome to LiveCampus! We are dedicated to connecting students, clubs, and faculty through a unified platform for events, collaboration, and communication.
    </p>
    <p className="text-neutral-700 mb-2">
      Our mission is to make campus life more vibrant and organized by providing tools for event management, club activities, and networking.
    </p>
    <p className="text-neutral-700">
      If you have any questions or suggestions, feel free to <a href="/contact" className="text-primary-600 underline">contact us</a>.
    </p>
  </div>
);

export default About;
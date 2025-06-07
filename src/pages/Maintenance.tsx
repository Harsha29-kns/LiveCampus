import React, { useEffect, useState } from 'react';

const Maintenance: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const targetDate = new Date('2025-07-01T10:00:00'); // 🕒 SET LAUNCH DATE HERE

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((distance / (1000 * 60)) % 60);
      const seconds = Math.floor((distance / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // 🔔 TODO: Send email to backend/email API
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12 text-center">
      <img
        src="/maintenance-plug.png"
        alt="Maintenance"
        className="max-w-sm mb-6 animate-fade-in"
      />

      <h1 className="text-3xl md:text-5xl font-bold text-blue-800 mb-3">
        This site is under maintenance
      </h1>
      <p className="text-gray-600 text-lg mb-6">
        We’re preparing to serve you better. Please check back later!
      </p>

      {/* Countdown Timer */}
      <div className="text-2xl font-semibold text-gray-700 mb-6 space-x-2">
        <span>{timeLeft.days}d</span>
        <span>{String(timeLeft.hours).padStart(2, '0')}h</span>
        <span>{String(timeLeft.minutes).padStart(2, '0')}m</span>
        <span>{String(timeLeft.seconds).padStart(2, '0')}s</span>
      </div>

      {/* Notify Me Form */}
      {!submitted ? (
        <form onSubmit={handleNotify} className="w-full max-w-sm flex flex-col sm:flex-row items-center gap-2">
          <input
            type="email"
            required
            placeholder="Enter your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Notify Me
          </button>
        </form>
      ) : (
        <p className="text-green-600 font-medium mt-4">
          Thank you! We’ll notify you once we’re back online.
        </p>
      )}

      <div className="mt-10 text-sm text-gray-400">~ LiveCampus Team</div>
    </div>
  );
};

export default Maintenance;

import React, { useState } from 'react';

const Maintenance: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // 🔔 TODO: Integrate backend/email API
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 text-white relative overflow-hidden px-4">
      
      {/* Glowing Circles */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-purple-600 opacity-30 rounded-full blur-3xl animate-pulse -z-10" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-indigo-600 opacity-30 rounded-full blur-3xl animate-pulse delay-500 -z-10" />

      {/* Content */}
      <div className="text-center animate-fade-in-up">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          🚧 We're Under Maintenance
        </h1>
        <p className="text-lg md:text-2xl text-slate-300 mb-6">
          Sorry for the inconvenience. We're improving your experience.
        </p>

        {/* Notify Me Form */}
        {!submitted ? (
          <form onSubmit={handleNotify} className="max-w-sm w-full mx-auto flex flex-col sm:flex-row items-center gap-2 px-2">
            <input
              type="email"
              required
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-2 rounded-md border border-gray-400 text-black focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition"
            >
              Notify Me
            </button>
          </form>
        ) : (
          <p className="text-green-400 mt-4">
            ✅ You’ll be notified when we’re back!
          </p>
        )}

        <p className="text-sm text-gray-400 mt-8">~ LiveCampus Team</p>
      </div>

      {/* Wavy SVG Footer */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
        <svg viewBox="0 0 1440 320" className="w-full h-40">
          <path
            fill="#6b21a8"
            fillOpacity="1"
            d="M0,128L40,154.7C80,181,160,235,240,240C320,245,400,203,480,176C560,149,640,139,720,133.3C800,128,880,128,960,154.7C1040,181,1120,235,1200,250.7C1280,267,1360,245,1400,234.7L1440,224L1440,320L1400,320C1360,320,1280,320,1200,320C1120,320,1040,320,960,320C880,320,800,320,720,320C640,320,560,320,480,320C400,320,320,320,240,320C160,320,80,320,40,320L0,320Z"
          ></path>
        </svg>
      </div>
    </div>
  );
};

export default Maintenance;

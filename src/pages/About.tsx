import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Users, Target, Heart } from 'lucide-react';

const About: React.FC = () => {
  const navigate = useNavigate();

  const stats = [
    { label: 'Active Students', value: '5,000+' },
    { label: 'Events Hosted', value: '1,200+' },
    { label: 'Clubs & Societies', value: '50+' },
    { label: 'Faculty Mentors', value: '100+' },
  ];

  const values = [
    {
      icon: <Users className="w-6 h-6 text-indigo-600" />,
      title: "Community First",
      description: "We believe in the power of connection. LiveCampus bridges the gap between students, clubs, and faculty."
    },
    {
      icon: <Target className="w-6 h-6 text-purple-600" />,
      title: "Innovation",
      description: "Constantly evolving to provide the best tools for event management and student engagement."
    },
    {
      icon: <Heart className="w-6 h-6 text-pink-600" />,
      title: "Inclusivity",
      description: "A platform for everyone. We support diverse interests, from tech clubs to art societies."
    }
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-indigo-100/20">
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
            <div className="mt-24 sm:mt-32 lg:mt-16">
              <a href="#" className="inline-flex space-x-6">
                <span className="rounded-full bg-indigo-600/10 px-3 py-1 text-sm font-semibold leading-6 text-indigo-600 ring-1 ring-inset ring-indigo-600/10">
                  Our Mission
                </span>
              </a>
            </div>
            <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Empowering Campus Life, One Event at a Time
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              LiveCampus is the ultimate platform for students to discover, organize, and participate in campus activities.
              We are dedicated to fostering a vibrant and connected university community.
            </p>
            <div className="mt-10 flex items-center gap-x-6">
              <Button onClick={() => navigate('/register')} size="lg">
                Join Our Community
              </Button>
              <Button variant="ghost" onClick={() => navigate('/features')} rightIcon={<span aria-hidden="true">→</span>}>
                Explore Features
              </Button>
            </div>
          </div>
          <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mt-0 lg:mr-0 lg:max-w-none lg:flex-none xl:ml-32">
            <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
              <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                <img
                  src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-4.0.3&auto=format&fit=crop&q=80&w=2070"
                  alt="App screenshot"
                  width={2432}
                  height={1442}
                  className="w-[76rem] rounded-md shadow-2xl ring-1 ring-gray-900/10"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-16 text-center lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="mx-auto flex max-w-xs flex-col gap-y-4">
                <dt className="text-base leading-7 text-gray-600">{stat.label}</dt>
                <dd className="order-first text-3xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Values Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 bg-gray-50 rounded-3xl mb-24">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600">Our Values</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything we do is driven by purpose
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            We are more than just a platform; we are a movement to revolutionize student engagement.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3 lg:gap-y-16">
            {values.map((value) => (
              <div key={value.title} className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-gray-900/10">
                    {value.icon}
                  </div>
                  {value.title}
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">{value.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
};

export default About;
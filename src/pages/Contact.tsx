import React, { useState } from 'react';
import { Mail, MapPin, Send, MessageCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success("Message sent successfully! We'll get back to you soon.");
    setFormData({ name: '', email: '', message: '' });
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-16 md:flex md:gap-x-10 md:space-y-0 text-center md:text-left">
          {/* Contact Info */}
          <div className="flex flex-col gap-10 md:w-1/2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Get in touch</h2>
              <p className="mt-4 text-lg leading-8 text-gray-600">
                Have questions about LiveCampus? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
              </p>
            </div>
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-x-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                  <Mail className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <div className="text-base leading-7">
                  <h3 className="font-semibold text-gray-900">Email</h3>
                  <a href="mailto:livecampuss@gmail.com" className="text-indigo-600 hover:text-indigo-500">
                    livecampuss@gmail.com
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-x-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                  <MessageCircle className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <div className="text-base leading-7">
                  <h3 className="font-semibold text-gray-900">WhatsApp Support</h3>
                  <div className="flex flex-col">
                    <a href="https://wa.me/917671084221" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">
                      +91 76710 84221
                    </a>
                    <a href="https://wa.me/919390195797" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">
                      +91 93901 95797
                    </a>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-x-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                  <MapPin className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <div className="text-base leading-7">
                  <h3 className="font-semibold text-gray-900">Campus</h3>
                  <p className="text-gray-600">
                    Kalasalingam University Campus,<br />
                    Student Activity Center
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:w-1/2 bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold leading-6 text-gray-900 mb-2">Name</label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold leading-6 text-gray-900 mb-2">Email</label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-semibold leading-6 text-gray-900 mb-2">Message</label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  className="block w-full rounded-md border-0 py-2 px-3.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="How can we help you?"
                  required
                />
              </div>
              <Button
                type="submit"
                isLoading={isSubmitting}
                fullWidth
                rightIcon={<Send size={16} />}
              >
                Send Message
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
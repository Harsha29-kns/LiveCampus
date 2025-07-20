import React from 'react';

const Contact: React.FC = () => (
  <div className="max-w-xl mx-auto py-12">
    <h1 className="text-2xl font-bold mb-4">Contact Us</h1>
    <p className="text-neutral-700 mb-2">
      For any queries, please email us at <a href="mailto:livecampuss@gmail.com" className="text-primary-600 underline">livecampuss@gmail.com</a>.
    </p>
    {
        <p className="text-neutral-700">
            You can also reach us through our social media channels:<br />
            WhatsApp: <a href="https://wa.me/7671084221" className="text-primary-600 underline" target='_blank'>+91 7671084221</a>,
            WhatsApp: <a href="https://wa.me/9390195797" className="text-primary-600 underline" target='_blank'>+91 9390195797</a>,
        </p>
    }
  </div>
);

export default Contact;
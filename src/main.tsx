import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            backgroundColor: '#FFF',
            color: '#1F2937',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            borderRadius: '0.375rem',
            padding: '0.75rem 1rem',
          },
          success: {
            iconTheme: {
              primary: '#34C759',
              secondary: '#FFF',
            },
          },
          error: {
            iconTheme: {
              primary: '#FF3B30',
              secondary: '#FFF',
            },
          },
        }}
      />
    </BrowserRouter>
  </StrictMode>
);
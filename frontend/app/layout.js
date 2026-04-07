'use client';

import { SaasProvider } from '@/context/SaasContext';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Inventory Management System</title>
      </head>
      <body>
        <SaasProvider>
          <Toaster 
            position="top-right"
            toastOptions={{
              style: {
                background: '#1a1a1a',
                color: '#f0f0f0',
                border: '1px solid #333',
                fontFamily: "'Space Mono', monospace",
                fontSize: '13px'
              },
              success: { iconTheme: { primary: '#e8ff47', secondary: '#000' } }
            }}
          />
          {children}
        </SaasProvider>
      </body>
    </html>
  );
}

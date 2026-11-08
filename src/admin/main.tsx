import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminApp from './AdminApp';
import { ThemeProvider } from './components/theme-provider';
import { AdminToaster } from './components/ui/AdminToaster';
import '../assets/fonts/fonts.css';
import './admin.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AdminToaster />
      <AdminApp />
    </ThemeProvider>
  </React.StrictMode>
);

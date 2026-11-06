import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import AdminApp from './AdminApp';
import '../assets/fonts/fonts.css';
import '../index.css';
import './admin.css';

const adminTheme = createTheme({
  primaryColor: 'pink',
  defaultRadius: 'md',
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={adminTheme} defaultColorScheme="dark">
      <Notifications position="top-right" zIndex={200000} />
      <AdminApp />
    </MantineProvider>
  </React.StrictMode>
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { Amplify } from 'aws-amplify';
import amplifyOutputs from '../amplify_outputs.json';

import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme/theme';

Amplify.configure(amplifyOutputs);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

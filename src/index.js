import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { HelpProvider } from './context/help/HelpContext';
import HelpBubble from './context/help/HelpBubble';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <HelpProvider>
        <App />
        <HelpBubble />
      </HelpProvider>
    </AuthProvider>
  </React.StrictMode>
);
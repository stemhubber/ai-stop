import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { HelpProvider } from './context/help/HelpContext';
import HelpBubble from './context/help/HelpBubble';
import { BusinessProvider } from './context/BusinessContext';
import { WebsiteProvider } from './context/WebsiteContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <WebsiteProvider>
        <BusinessProvider>
          <HelpProvider>
            <App />
            <HelpBubble />
          </HelpProvider>
        </BusinessProvider>
      </WebsiteProvider>
    </AuthProvider>
  </React.StrictMode>
);

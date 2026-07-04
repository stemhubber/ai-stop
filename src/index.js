import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { HelpProvider } from './context/help/HelpContext';
import HelpBubble from './context/help/HelpBubble';
import { BusinessProvider } from './context/BusinessContext';
import { WebsiteProvider } from './context/WebsiteContext';
import { PlanProvider } from './context/PlanContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <PlanProvider>
        <WebsiteProvider>
          <BusinessProvider>
            <HelpProvider>
              <App />
              <HelpBubble />
            </HelpProvider>
          </BusinessProvider>
        </WebsiteProvider>
      </PlanProvider>
    </AuthProvider>
  </React.StrictMode>
);

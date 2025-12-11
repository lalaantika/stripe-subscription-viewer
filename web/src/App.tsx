import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { RouteProtection } from './components/RouteProtection';

const App: React.FC = () => {
  return (
    <Authenticator.Provider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <RouteProtection>
                <Dashboard />
              </RouteProtection>
            }
          />
          {/* Default: if authenticated, this will show dashboard; otherwise ProtectedRoute sends to /login */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </Authenticator.Provider>
  );
};

export default App;

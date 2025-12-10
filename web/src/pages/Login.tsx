import React from 'react';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import { Navigate } from 'react-router-dom';
import '@aws-amplify/ui-react/styles.css';

export const Login: React.FC = () => {
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);

  if (authStatus === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div style={{ maxWidth: 480, margin: '2rem auto', padding: '1rem' }}>
      <h2 style={{ marginBottom: '1rem' }}>Sign in</h2>
      <Authenticator
        initialState="signIn"
        components={{
          Header() {
            return null; 
          },
        }}
      />
    </div>
  );
};

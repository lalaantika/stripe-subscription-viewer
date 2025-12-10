// src/components/ProtectedRoute.tsx
import React, { type JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';

type Props = {
  children: JSX.Element;
};

export const RouteProtection: React.FC<Props> = ({ children }) => {
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);

  // If not signed in → go to login
  if (authStatus === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  // If authenticated → allow access
  return children;

  return children;
};

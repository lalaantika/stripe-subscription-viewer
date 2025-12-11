import React, { useEffect, useState } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import SubscriptionStatus from '../components/SubscriptionStatus';
import { getSubscription, getBillingHistory } from '../lib/api';
import type {
  SubscriptionResponse,
  BillingHistoryResponse,
} from '../lib/types';

export const Dashboard: React.FC = () => {
  const { user, signOut } = useAuthenticator((context) => [
    context.user,
    context.signOut,
  ]);

  const [subscription, setSubscription] =
    useState<SubscriptionResponse | null>(null);
  const [billingHistory, setBillingHistory] =
    useState<BillingHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadSubscription = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getSubscription();
      setSubscription(data);
    } catch (e) {
      console.error('Failed to load subscription', e);
      setError('Failed to load subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBillingHistory = async () => {
    try {
      const data = await getBillingHistory();
      setBillingHistory(data);
    } catch (e) {
      console.error('Failed to load billing history', e);
    }
  };

  useEffect(() => {
    void loadSubscription();
    void loadBillingHistory();
  }, []);
  
  console.log('Dashboard subscription state', {
  subscription,
  isLoading,
  error,
});

  return (
    <div style={{ padding: '1rem', maxWidth: 640, margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h2>Dashboard</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            {user?.signInDetails?.loginId ?? user?.username}
          </span>
          <button onClick={signOut}>Sign out</button>
        </div>
      </header>

      <section>
        <h3>Your subscription</h3>
        <SubscriptionStatus
          data={subscription}
          isLoading={isLoading}
          error={error}
          onRetry={loadSubscription}
          billingHistory={billingHistory}
        />
      </section>
    </div>
  );
};

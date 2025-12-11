import type { SubscriptionResponse } from './types';
import outputs from '../../amplify_outputs.json';
import type { BillingHistoryResponse } from './types';

// Read our custom API details from amplify_outputs.json
const subscriptionApi =
  (outputs as any).custom?.API?.subscriptionApi ?? null;

const BASE_URL: string = subscriptionApi?.endpoint ?? '';

if (!BASE_URL) {
  // This will help  notice if amplify_outputs isn't wired correctly
  console.warn('Subscription API base URL is not configured in amplify_outputs.json');
}

export async function getSubscription(): Promise<SubscriptionResponse> {
  if (!BASE_URL) {
    throw new Error('API base URL not configured');
  }

  const res = await fetch(`${BASE_URL}subscription`, {
    method: 'GET',
    // For now not using cookies/JWT; can add credentials later.
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch subscription: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as SubscriptionResponse;
}

export async function createBillingPortalSession(): Promise<{ url: string }> {
  if (!BASE_URL) {
    throw new Error('API base URL not configured');
  }

  const res = await fetch(`${BASE_URL}billing-portal`, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error(
      `Failed to create billing portal session: ${res.status} ${res.statusText}`,
    );
  }

  return (await res.json()) as { url: string };
}

export async function getBillingHistory(): Promise<BillingHistoryResponse> {
  const res = await fetch(`${BASE_URL}/billing-history`, {
    method: 'GET',
    // No credentials here – avoids CORS conflict with Access-Control-Allow-Origin: *
    // credentials: 'omit', // (default for cross-origin if  want to be explicit)
  });

  if (!res.ok) {
    throw new Error('Failed to load billing history');
  }

  return res.json();
}

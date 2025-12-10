import { defineFunction, secret } from '@aws-amplify/backend';

export const createBillingPortalSession = defineFunction({
  name: 'create-billing-portal-session',
  entry: './handler.ts',
  environment: {
    STRIPE_CUSTOMER_ID: 'cus_TYzImJAmbrtcG9',
    STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY'),
    BILLING_PORTAL_RETURN_URL: 'http://localhost:5173/dashboard',
  },
});

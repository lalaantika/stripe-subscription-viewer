import { defineFunction, secret } from '@aws-amplify/backend';

export const getBillingHistory = defineFunction({
  name: 'get-billing-history',
  entry: './handler.ts',
  environment: {
    STRIPE_CUSTOMER_ID: "cus_TYzImJAmbrtcG9",
    STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY'),
     AMPLITUDE_API_KEY: secret('AMPLITUDE_API_KEY'), 
  },
});

import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import Stripe from 'stripe';
import { env } from '$amplify/env/create-billing-portal-session';
import {
  logAmplitudeEvent,
  getUserIdFromEvent,
} from '../shared/amplitudeClient';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  console.log('create-billing-portal-session invoked', {
    path: event.rawPath,
    customerId: env.STRIPE_CUSTOMER_ID,
  });

  const userId = getUserIdFromEvent(event);

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: env.STRIPE_CUSTOMER_ID,
      return_url:
        env.BILLING_PORTAL_RETURN_URL ?? 'http://localhost:5173/dashboard',
    });

    // Amplitude: user clicked Manage Billing
    void logAmplitudeEvent({
      event_type: 'manage_billing_clicked',
      user_id: userId,
      event_properties: {
        stripeCustomerId: env.STRIPE_CUSTOMER_ID,
        hasReturnUrl: !!env.BILLING_PORTAL_RETURN_URL,
        hasPortalUrl: !!session.url,
      },
    });

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('Error creating billing portal session', err);

    return {
      statusCode: 500,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({
        message: 'Failed to create billing portal session',
      }),
    };
  }
};
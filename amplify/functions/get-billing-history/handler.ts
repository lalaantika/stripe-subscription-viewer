import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import Stripe from 'stripe';
import { env } from '$amplify/env/get-billing-history';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

interface InvoiceItem {
  id: string;
  number: string | null;
  status: string | null;
  amountDue: number;
  currency: string;
  createdAt: string;
  hostedInvoiceUrl: string | null;
}

interface BillingHistoryResponse {
  invoices: InvoiceItem[];
}

export const handler: APIGatewayProxyHandlerV2 = async () => {
  console.log('get-billing-history invoked', {
    customerId: env.STRIPE_CUSTOMER_ID,
  });

  try {
    const invoices = await stripe.invoices.list({
      customer: env.STRIPE_CUSTOMER_ID,
      limit: 10, // last 10 invoices
    });

    const items: InvoiceItem[] = invoices.data.map((inv) => ({
      id: inv.id,
      number: inv.number ?? null,
      status: inv.status ?? null,
      amountDue: inv.amount_due ?? 0,
      currency: inv.currency ?? 'usd',
      createdAt: inv.created ? new Date(inv.created * 1000).toISOString() : '',
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
    }));

    const body: BillingHistoryResponse = { invoices: items };

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify(body),
    };
  } catch (err) {
    console.error('Error fetching billing history from Stripe', err);

    return {
      statusCode: 500,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({ message: 'Failed to fetch billing history' }),
    };
  }
};

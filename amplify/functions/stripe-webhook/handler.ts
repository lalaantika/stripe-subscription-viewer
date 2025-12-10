// amplify/functions/stripe-webhook/handler.ts
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import Stripe from 'stripe';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'no_subscription';

interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SUBSCRIPTION_TABLE_NAME: string;
}

const env = process.env as unknown as Env;

const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const ddb = new DynamoDBClient({});

const fix = (s?: string | null) => (s && s.length > 0 ? s : '');

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const tableName = env.SUBSCRIPTION_TABLE_NAME;

  // 1️⃣ Read raw body (don't parse JSON before verifying)
  let rawBody = event.body || '';
  if (event.isBase64Encoded) {
    rawBody = Buffer.from(rawBody, 'base64').toString('utf8');
  }

  const sig =
    event.headers['stripe-signature'] ||
    event.headers['Stripe-Signature'] ||
    event.headers['STRIPE-SIGNATURE'];

  if (!sig) {
    console.error('Missing Stripe-Signature header');
    return { statusCode: 400, body: 'Missing signature' };
  }

  let stripeEvent: Stripe.Event;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error('Failed to verify Stripe webhook', err);
    return { statusCode: 400, body: 'Invalid signature' };
  }

  console.log('Stripe webhook received', {
    id: stripeEvent.id,
    type: stripeEvent.type,
  });

  // 2️⃣ We only handle subscription events for this stretch goal
  if (
    stripeEvent.type === 'customer.subscription.created' ||
    stripeEvent.type === 'customer.subscription.updated' ||
    stripeEvent.type === 'customer.subscription.deleted'
  ) {
    const sub = stripeEvent.data.object as Stripe.Subscription;
    const stripeCustomerId = sub.customer as string;

    // Map Stripe status → your union
    const statusMap: Record<string, SubscriptionStatus> = {
      active: 'active',
      trialing: 'trialing',
      past_due: 'past_due',
      canceled: 'canceled',
    };
    const mappedStatus: SubscriptionStatus =
      statusMap[sub.status] ?? 'no_subscription';

    const price = sub.items.data[0]?.price;

    // Plan name: nickname → product name → ID
    let planName: string | null = null;
    let productName: string | null = null;

    if (price?.product && typeof price.product === 'string') {
      try {
        const product = await stripe.products.retrieve(price.product);
        productName = (product as any).name ?? null;
      } catch (err) {
        console.warn('Failed to retrieve product for price in webhook', {
          priceId: price.id,
          productId: price.product,
          err,
        });
      }
    }

    planName =
      price?.nickname ||
      productName ||
      (typeof price?.product === 'string' ? price.product : null);

    // Renewal period (e.g. "Every 3 months")
    let renewalPeriod: string | null = null;
    if (price?.recurring?.interval) {
      const interval = price.recurring.interval;
      const count = price.recurring.interval_count ?? 1;
      const unitLabel = count === 1 ? interval : `${count} ${interval}s`;
      renewalPeriod = `Every ${unitLabel}`;
    }

    // Period dates
    const rawSub = sub as any;
    const currentPeriodStart = rawSub.current_period_start
      ? new Date(rawSub.current_period_start * 1000).toISOString()
      : null;
    const currentPeriodEnd = rawSub.current_period_end
      ? new Date(rawSub.current_period_end * 1000).toISOString()
      : null;

    console.log('Webhook subscription mapped state', {
      stripeCustomerId,
      status: mappedStatus,
      planName,
      renewalPeriod,
      currentPeriodStart,
      currentPeriodEnd,
    });

    if (!tableName) {
      console.warn(
        'SUBSCRIPTION_TABLE_NAME is not set, skipping DB write in webhook',
      );
    } else {
      const putCmd = new PutItemCommand({
        TableName: tableName,
        Item: {
          stripeCustomerId: { S: stripeCustomerId },
          status: { S: mappedStatus },
          planName: { S: fix(planName) },
          renewalPeriod: { S: fix(renewalPeriod) },
          currentPeriodStart: { S: fix(currentPeriodStart) },
          currentPeriodEnd: { S: fix(currentPeriodEnd) },
          updatedAt: { S: new Date().toISOString() },
        },
      });

      try {
        await ddb.send(putCmd);
        console.log('Subscription state updated from webhook');
      } catch (err) {
        console.error('Failed to write subscription state from webhook', err);
      }
    }
  } else {
    // Not a subscription event – you can extend later
    console.log('Ignoring non-subscription event', stripeEvent.type);
  }

  return {
    statusCode: 200,
    body: 'ok',
  };
};
// amplify/functions/get-subscription/handler.ts
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import Stripe from 'stripe';
import { env } from '$amplify/env/get-subscription';
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import {
  logAmplitudeEvent,
  getUserIdFromEvent,
} from '../shared/amplitudeClient';

// ⬇️ Shared types + pure mapper logic
import type { SubscriptionItem, SubscriptionStatus } from './mapper';
import { mapStripeSubscriptionToItem } from './mapper';

interface SubscriptionResponse {
  status: SubscriptionStatus;
  planName?: string | null;
  renewsAt?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  renewalPeriod?: string | null;
  subscriptions?: SubscriptionItem[];
}

// Stripe client from secret
const stripe = new Stripe(env.STRIPE_SECRET_KEY);

// DynamoDB client for simple local cache
const ddb = new DynamoDBClient({});
const TABLE_NAME = (env as any).SUBSCRIPTION_TABLE_NAME as string;

const fixEmpty = (value?: string | null): string | null =>
  value && value.length > 0 ? value : null;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  console.log('get-subscription invoked', {
    path: event.rawPath,
    customerId: env.STRIPE_CUSTOMER_ID,
    tableName: TABLE_NAME,
  });

  const userId = getUserIdFromEvent(event);

  try {
    // 1️⃣ Try to read from local DB cache first
    if (TABLE_NAME) {
      try {
        const getResult = await ddb.send(
          new GetItemCommand({
            TableName: TABLE_NAME,
            Key: {
              stripeCustomerId: { S: env.STRIPE_CUSTOMER_ID },
            },
          }),
        );

        if (getResult.Item) {
          console.log('Found subscription in local DB cache', getResult.Item);

          const status =
            (getResult.Item.status?.S as SubscriptionStatus) ??
            'no_subscription';

          const bodyFromCache: SubscriptionResponse = {
            status,
            planName: fixEmpty(getResult.Item.planName?.S ?? null),
            renewalPeriod: fixEmpty(getResult.Item.renewalPeriod?.S ?? null),
            currentPeriodStart: fixEmpty(
              getResult.Item.currentPeriodStart?.S ?? null,
            ),
            currentPeriodEnd: fixEmpty(
              getResult.Item.currentPeriodEnd?.S ?? null,
            ),
            renewsAt: fixEmpty(getResult.Item.currentPeriodEnd?.S ?? null),
            subscriptions: [], // summary only in DB for simplicity
          };

          // Amplitude: subscription viewed (from cache)
          void logAmplitudeEvent({
            event_type: 'subscription_status_viewed',
            user_id: userId,
            event_properties: {
              source: 'cache',
              status: bodyFromCache.status,
              planName: bodyFromCache.planName,
              renewalPeriod: bodyFromCache.renewalPeriod ?? null,
              subscriptionCount: bodyFromCache.subscriptions?.length ?? 0,
            },
            user_properties: {
              subscription_status: bodyFromCache.status,
              subscription_plan: bodyFromCache.planName ?? undefined,
            },
          });

          return {
            statusCode: 200,
            headers: {
              'content-type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': '*',
            },
            body: JSON.stringify(bodyFromCache),
          };
        }
      } catch (cacheErr) {
        console.warn('Failed to read from subscription cache table', cacheErr);
        // fall through to Stripe
      }
    }

    // 2️⃣ No cache (or error) → fall back to Stripe
    const subs = await stripe.subscriptions.list({
      customer: env.STRIPE_CUSTOMER_ID,
      status: 'all',
      limit: 10, // up to 10 subscriptions
    });

    const allSubs = subs.data;

    let body: SubscriptionResponse;

    if (!allSubs || allSubs.length === 0) {
      body = {
        status: 'no_subscription',
        planName: null,
        renewsAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        renewalPeriod: null,
        subscriptions: [],
      };
    } else {
      // Use the pure mapper for each Stripe subscription
      const items: SubscriptionItem[] = await Promise.all(
        allSubs.map(async (sub) => {
          const price = sub.items.data[0]?.price;

          // still fetch productName from Stripe (this part *is* async)
          let productName: string | null = null;
          if (price?.product && typeof price.product === 'string') {
            try {
              const product = await stripe.products.retrieve(price.product);
              productName = (product as any).name ?? null;
            } catch (err) {
              console.warn('Failed to retrieve product for price', {
                priceId: price.id,
                productId: price.product,
                err,
              });
            }
          }

          // delegate the shape logic to mapper.ts
          return mapStripeSubscriptionToItem(sub, { productName });
        }),
      );

      const primary = items[0];

      body = {
        status: primary.status,
        planName: primary.planName,
        renewsAt: primary.currentPeriodEnd,
        currentPeriodStart: primary.currentPeriodStart,
        currentPeriodEnd: primary.currentPeriodEnd,
        renewalPeriod: primary.renewalPeriod,
        subscriptions: items,
      };
    }

    // 3️⃣ Write latest state into local DB cache
    if (TABLE_NAME) {
      try {
        await ddb.send(
          new PutItemCommand({
            TableName: TABLE_NAME,
            Item: {
              stripeCustomerId: { S: env.STRIPE_CUSTOMER_ID },
              status: { S: body.status },
              planName: { S: body.planName ?? '' },
              renewalPeriod: { S: body.renewalPeriod ?? '' },
              currentPeriodStart: { S: body.currentPeriodStart ?? '' },
              currentPeriodEnd: { S: body.currentPeriodEnd ?? '' },
              updatedAt: { S: new Date().toISOString() },
            },
          }),
        );
        console.log('Subscription state written to local DB cache');
      } catch (writeErr) {
        console.warn('Failed to write subscription state to cache', writeErr);
      }
    }

    // 4️⃣ Amplitude: subscription viewed (from Stripe)
    void logAmplitudeEvent({
      event_type: 'subscription_status_viewed',
      user_id: userId,
      event_properties: {
        source: 'stripe',
        status: body.status,
        planName: body.planName,
        renewalPeriod: body.renewalPeriod ?? null,
        subscriptionCount: body.subscriptions?.length ?? 0,
      },
      user_properties: {
        subscription_status: body.status,
        subscription_plan: body.planName ?? undefined,
      },
    });

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
    console.error('Error fetching subscription from Stripe', err);

    return {
      statusCode: 500,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({
        message: 'Failed to fetch subscription',
      }),
    };
  }
};
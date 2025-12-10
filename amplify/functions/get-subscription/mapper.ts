// amplify/functions/get-subscription/mapper.ts
import type Stripe from 'stripe';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'no_subscription';

export interface SubscriptionItem {
  id: string;
  status: SubscriptionStatus;
  planName: string | null;
  renewalPeriod: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}

export function mapStripeStatus(status: string): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
  };
  return statusMap[status] ?? 'no_subscription';
}

export function buildRenewalPeriod(
  price: Stripe.Price | null | undefined,
): string | null {
  if (!price?.recurring?.interval) return null;

  const interval = price.recurring.interval; // 'day' | 'week' | 'month' | 'year'
  const count = price.recurring.interval_count ?? 1;
  const unitLabel = count === 1 ? interval : `${count} ${interval}s`;
  return `Every ${unitLabel}`;
}

export function mapStripeSubscriptionToItem(
  sub: Stripe.Subscription,
  opts: { productName?: string | null } = {},
): SubscriptionItem {
  const status = mapStripeStatus(sub.status);
  const price = sub.items.data[0]?.price;

  const planName =
    price?.nickname ||
    opts.productName ||
    (typeof price?.product === 'string' ? price.product : null);

  const renewalPeriod = buildRenewalPeriod(price);

  const rawSub = sub as any;
  const currentPeriodStart = rawSub.current_period_start
    ? new Date(rawSub.current_period_start * 1000).toISOString()
    : null;
  const currentPeriodEnd = rawSub.current_period_end
    ? new Date(rawSub.current_period_end * 1000).toISOString()
    : null;

  return {
    id: sub.id,
    status,
    planName,
    renewalPeriod,
    currentPeriodStart,
    currentPeriodEnd,
  };
}
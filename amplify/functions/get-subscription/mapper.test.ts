import { describe, it, expect } from 'vitest';
import {
  mapStripeStatus,
  buildRenewalPeriod,
  mapStripeSubscriptionToItem,
  type SubscriptionItem,
} from './mapper';

function makeFakeStripeSub(overrides: Partial<any> = {}): any {
  return {
    id: 'sub_123',
    status: 'active',
    items: {
      data: [
        {
          price: {
            id: 'price_123',
            nickname: 'Pro plan',
            recurring: {
              interval: 'month',
              interval_count: 1,
            },
            product: 'prod_123',
          },
        },
      ],
    },
    current_period_start: 1_700_000_000, // unix seconds
    current_period_end: 1_700_086_400,
    ...overrides,
  };
}

describe('mapStripeStatus', () => {
  it('maps known statuses correctly', () => {
    expect(mapStripeStatus('active')).toBe('active');
    expect(mapStripeStatus('trialing')).toBe('trialing');
    expect(mapStripeStatus('past_due')).toBe('past_due');
    expect(mapStripeStatus('canceled')).toBe('canceled');
  });

  it('falls back to no_subscription for unknown status', () => {
    expect(mapStripeStatus('weird_status')).toBe('no_subscription');
  });
});

describe('buildRenewalPeriod', () => {
  it('returns null if no recurring info', () => {
    expect(buildRenewalPeriod(undefined as any)).toBeNull();
  });

  it('builds human readable label for monthly plans', () => {
    const price: any = {
      recurring: { interval: 'month', interval_count: 1 },
    };
    expect(buildRenewalPeriod(price)).toBe('Every month');
  });

  it('handles multi-interval plans', () => {
    const price: any = {
      recurring: { interval: 'month', interval_count: 3 },
    };
    expect(buildRenewalPeriod(price)).toBe('Every 3 months');
  });
});

describe('mapStripeSubscriptionToItem', () => {
  it('maps a full subscription including nickname and dates', () => {
    const sub = makeFakeStripeSub();

    const item: SubscriptionItem = mapStripeSubscriptionToItem(sub as any, {
      productName: 'Pro from product',
    });

    expect(item.id).toBe('sub_123');
    expect(item.status).toBe('active');
    expect(item.planName).toBe('Pro plan'); // nickname wins
    expect(item.renewalPeriod).toBe('Every month');
    expect(item.currentPeriodStart).toMatch(/^2023|2024|2025/); // ISO string
    expect(item.currentPeriodEnd).toMatch(/^2023|2024|2025/);
  });

  it('falls back to productName when nickname is missing', () => {
    const sub = makeFakeStripeSub({
      items: {
        data: [
          {
            price: {
              id: 'price_123',
              nickname: null,
              recurring: { interval: 'month', interval_count: 1 },
              product: 'prod_123',
            },
          },
        ],
      },
    });

    const item = mapStripeSubscriptionToItem(sub as any, {
      productName: 'Product Plan',
    });

    expect(item.planName).toBe('Product Plan');
  });

  it('falls back to product id when nothing else is available', () => {
    const sub = makeFakeStripeSub({
      items: {
        data: [
          {
            price: {
              id: 'price_123',
              nickname: null,
              recurring: { interval: 'month', interval_count: 1 },
              product: 'prod_123',
            },
          },
        ],
      },
    });

    const item = mapStripeSubscriptionToItem(sub as any, {
      productName: null,
    });

    expect(item.planName).toBe('prod_123');
  });
});
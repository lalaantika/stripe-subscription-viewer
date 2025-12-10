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

export interface SubscriptionResponse {
  status: SubscriptionStatus;
  planName?: string | null;
  renewsAt?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  renewalPeriod?: string | null;
  subscriptions?: SubscriptionItem[];
}

export interface InvoiceItem {
  id: string;
  number: string | null;
  status: string | null;
  amountDue: number;
  currency: string;
  createdAt: string;
  hostedInvoiceUrl: string | null;
}

export interface BillingHistoryResponse {
  invoices: InvoiceItem[];
}


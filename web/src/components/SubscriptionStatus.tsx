// src/components/SubscriptionStatus.tsx
import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Stack,
} from '@mui/material';
import type {
  SubscriptionResponse,
  SubscriptionItem,
  BillingHistoryResponse,
} from '../lib/types';
import { createBillingPortalSession } from '../lib/api';

interface Props {
  data: SubscriptionResponse | null;
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  billingHistory?: BillingHistoryResponse | null; // optional stretch-goal prop
}

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const statusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'success';
    case 'trialing':
      return 'info';
    case 'past_due':
      return 'warning';
    case 'canceled':
      return 'default';
    case 'no_subscription':
    default:
      return 'default';
  }
};

const SubscriptionStatus: React.FC<Props> = ({
  data,
  isLoading,
  error,
  onRetry,
  billingHistory,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            Loading subscription…
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body1" color="error" gutterBottom>
            {error}
          </Typography>
          {onRetry && (
            <Button variant="outlined" onClick={onRetry}>
              Retry
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const subs: SubscriptionItem[] = data.subscriptions ?? [];
  const invoices = billingHistory?.invoices ?? [];

  const getRenewalLabel = () => {
    const date = data.renewsAt ?? data.currentPeriodEnd ?? null;

    if (date) {
      const d = new Date(date);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
    }

    if (data.renewalPeriod) {
      return data.renewalPeriod; // e.g. "Every 3 months"
    }

    return '—';
  };

  const handleManageBilling = async () => {
    try {
      const { url } = await createBillingPortalSession();
      if (url) {
        window.location.href = url;
      }
    } catch (e) {
      console.error('Failed to open billing portal', e);
      alert('Failed to open billing portal. Please try again.');
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      {/* Primary summary card */}
      <Card>
        <CardHeader title="Subscription" />
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={3}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
          >
            <Box display="flex" flexDirection="column" gap={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  size="small"
                  label={
                    data.status === 'no_subscription'
                      ? 'No subscription'
                      : data.status
                  }
                  color={statusColor(data.status) as any}
                  variant="outlined"
                />
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Plan
                </Typography>
                <Typography variant="body1">
                  {data.planName ??
                    (data.status === 'no_subscription' ? '—' : 'Unknown')}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Renews on
                </Typography>
                <Typography variant="body1">{getRenewalLabel()}</Typography>
              </Box>
            </Box>

            <Box>
              <Button
                variant="contained"
                onClick={handleManageBilling}
                disabled={data.status === 'no_subscription'}
              >
                Manage billing
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Table of all subscriptions */}
      {subs.length > 0 && (
        <Card>
          <CardHeader title="All subscriptions" />
          <CardContent>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Plan</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Renewal</TableCell>
                  <TableCell>Period start</TableCell>
                  <TableCell>Period end</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subs.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>{sub.planName ?? '—'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={sub.status}
                        color={statusColor(sub.status) as any}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{sub.renewalPeriod ?? '—'}</TableCell>
                    <TableCell>{formatDate(sub.currentPeriodStart)}</TableCell>
                    <TableCell>{formatDate(sub.currentPeriodEnd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {subs.length === 0 && data.status === 'no_subscription' && (
        <Typography variant="body2" color="text.secondary">
          This account does not have any active subscriptions.
        </Typography>
      )}

      {/* Billing history (stretch goal) */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader title="Billing history" />
          <CardContent>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Invoice #</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Link</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{formatDate(inv.createdAt)}</TableCell>
                    <TableCell>{inv.number ?? '—'}</TableCell>
                    <TableCell>{inv.status ?? '—'}</TableCell>
                    <TableCell align="right">
                      {(inv.amountDue / 100).toFixed(2)}{' '}
                      {inv.currency.toUpperCase()}
                    </TableCell>
                    <TableCell>
                      {inv.hostedInvoiceUrl ? (
                        <a
                          href={inv.hostedInvoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default SubscriptionStatus;

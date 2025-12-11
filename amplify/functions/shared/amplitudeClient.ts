import type { APIGatewayProxyEventV2 } from 'aws-lambda';

// Lambda Node 18/20 has global fetch, but TS may not know about it
declare const fetch: (input: any, init?: any) => Promise<any>;

interface AmplitudeEvent {
  event_type: string;
  user_id?: string;
  device_id?: string;
  event_properties?: Record<string, unknown>;
  user_properties?: Record<string, unknown>;
}

const AMPLITUDE_ENDPOINT = 'https://api2.amplitude.com/2/httpapi';

export async function logAmplitudeEvent(event: AmplitudeEvent): Promise<void> {
  const apiKey = process.env.AMPLITUDE_API_KEY;
  
  if (!apiKey) {
    console.warn('AMPLITUDE_API_KEY not set, skipping Amplitude logging');
    return;
  }

  try {
    const payload = {
      api_key: apiKey,
      events: [event],
    };

    await fetch(AMPLITUDE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*',
      },
      body: JSON.stringify(payload),
    });
    console.log('Sending Amplitude event', JSON.stringify(payload));
  } catch (err) {
    console.warn('Failed to send Amplitude event', err);
  }
}

/**
 * Extract a stable user id from API Gateway event.
 * Cast requestContext to any so TS doesn't complain about `authorizer`.
 */
export function getUserIdFromEvent(apiEvent: APIGatewayProxyEventV2): string {
  const rc: any = apiEvent.requestContext as any;
  const claims = rc?.authorizer?.jwt?.claims ?? {};

  return (
    (claims.sub as string) ||
    (claims['cognito:username'] as string) ||
    'unknown'
  );
}
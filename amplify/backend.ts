import { defineBackend } from '@aws-amplify/backend';
import { Stack } from 'aws-cdk-lib';
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

import { auth } from './auth/resource';
import { getSubscription } from './functions/get-subscription/resource';
import { createBillingPortalSession } from './functions/create-billing-portal-session/resource';
import { getBillingHistory } from './functions/get-billing-history/resource';
import { stripeWebhook } from './functions/stripe-webhook/resource';

// Register resources with Amplify
const backend = defineBackend({
  auth,
  getSubscription,
  createBillingPortalSession,
  getBillingHistory,
  stripeWebhook,
});

// Create a dedicated stack for the HTTP API
const apiStack = backend.createStack('subscription-api-stack');

//  Create DynamoDB table for subscription cache
const subscriptionTable = new dynamodb.Table(
  backend.stack, 
  'SubscriptionStateTable',
  {
    partitionKey: {
      name: 'stripeCustomerId',
      type: dynamodb.AttributeType.STRING,
    },
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  },
);

// Wire env + permissions for getSubscription
backend.getSubscription.addEnvironment(
  'SUBSCRIPTION_TABLE_NAME',
  subscriptionTable.tableName,
);
subscriptionTable.grantReadWriteData(backend.getSubscription.resources.lambda);

// Wire env + permissions for stripeWebhook (so webhook can update the same table)
backend.stripeWebhook.addEnvironment(
  'SUBSCRIPTION_TABLE_NAME',
  subscriptionTable.tableName,
);
subscriptionTable.grantReadWriteData(backend.stripeWebhook.resources.lambda);

// Create Lambda integrations for HTTP API
const getSubscriptionIntegration = new HttpLambdaIntegration(
  'GetSubscriptionIntegration',
  backend.getSubscription.resources.lambda,
);

const billingPortalIntegration = new HttpLambdaIntegration(
  'BillingPortalIntegration',
  backend.createBillingPortalSession.resources.lambda,
);

const getBillingHistoryIntegration = new HttpLambdaIntegration(
  'GetBillingHistoryIntegration',
  backend.getBillingHistory.resources.lambda,
);

const stripeWebhookIntegration = new HttpLambdaIntegration(
  'StripeWebhookIntegration',
  backend.stripeWebhook.resources.lambda,
);

// Create HTTP API
const httpApi = new HttpApi(apiStack, 'SubscriptionApi', {
  apiName: 'subscriptionApi',
  corsPreflight: {
    allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST],
    allowOrigins: ['*'], // fine for local dev; can restrict later
    allowHeaders: ['*'],
  },
  createDefaultStage: true,
});

// 6. Add routes
httpApi.addRoutes({
  path: '/subscription',
  methods: [HttpMethod.GET],
  integration: getSubscriptionIntegration,
});

httpApi.addRoutes({
  path: '/billing-portal',
  methods: [HttpMethod.POST],
  integration: billingPortalIntegration,
});

httpApi.addRoutes({
  path: '/billing-history',
  methods: [HttpMethod.GET],
  integration: getBillingHistoryIntegration,
});

// Webhook must be POST and use a Lambda integration, not the function object
httpApi.addRoutes({
  path: '/stripe-webhook',
  methods: [HttpMethod.POST],
  integration: stripeWebhookIntegration,
});

// Output API config into amplify_outputs.json
backend.addOutput({
  custom: {
    API: {
      [httpApi.httpApiName!]: {
        endpoint: httpApi.url,
        region: Stack.of(httpApi).region,
        apiName: httpApi.httpApiName,
      },
    },
  },
});

export default backend;
# Architecture 
+------------------------+        +-----------------------------+
|        Frontend        |        |        AWS Amplify Gen 2    |
|  React + TypeScript    |        |  (Auth + API + Functions)   |
+-----------+------------+        +---------------+-------------+
            |                                     |
            | Authenticated Requests              |
            | (GET /subscription,                 |
            |  POST /billing-portal,              |
            |  GET /billing-history)              |
            v                                     v
+------------------------+        +-----------------------------+
|      API Gateway       | -----> |     Lambda Functions        |
|   (HTTP API Routes)    |        | - get-subscription          |
|                        |        | - create-billing-portal     |
|                        |        | - get-billing-history       |
|                        |        | - stripe-webhook            |
+------------------------+        +---------------+-------------+
                                                    |
                                                    | Reads/Writes
                                                    v
                                     +-----------------------------+
                                     |         DynamoDB            |
                                     |  SubscriptionStateTable     |
                                     |  (cached subscription info) |
                                     +-----------------------------+
                                                    |
                                                    | Calls Stripe APIs
                                                    v
                                     +-----------------------------+
                                     |           Stripe            |
                                     | - Subscriptions API         |
                                     | - Billing Portal Sessions   |
                                     | - Invoices API              |
                                     | - Webhooks → Lambda         |
                                     +-----------------------------+


# Architecture Decisions

## 1. Amplify Gen 2 for Backend
Amplify Gen 2 provides:
- Strong TypeScript support  
- CDK-backed infrastructure  
- Clean secret/environment handling  
- Automatic frontend output config  

Each backend function is isolated and testable.

## 2. Thin Lambda Functions  
Each function focuses on one responsibility:
- `get-subscription`: Returns subscription status  
- `create-billing-portal-session`: Creates Stripe billing portal sessions  
- `get-billing-history`: Returns invoice history  
- `stripe-webhook`: Syncs Stripe → DynamoDB  

## 3. Server‑Side Stripe Integration
Secrets never touch the browser.  
All Stripe operations run in Lambda.

## 4. DynamoDB as Local Cache
Stores:
- Status  
- Plan name  
- Renewal period  
- Billing timestamps  

Improves performance and reduces Stripe load.

## 5. Webhook Sync
Webhook ensures DynamoDB always reflects the latest Stripe state.

## 6. React Frontend with Amplify Auth
Protected routes use:
- `RouteProtection` component  
- Amplify Auth session checks  

## 7. Optional Amplitude Telemetry
Tracks:
- Subscription viewed  
- Billing portal clicked  
- Data source (cache/Stripe)

---

# Assumptions

- Single Stripe customer ID mapped to all users  
- Minimal UI styling as per assignment  
- No multi-tenant billing system  
- Simplified return URL  
- Only one environment required  

---

# What Would Improve With More Time

## 1. Real User → Stripe Customer Mapping  
Persist mapping using DynamoDB or Amplify Data.

## 2. More Automated Tests  
Add tests for:
- Webhook handler  
- get-subscription full integration  
- React components  

## 3. Webhook Reliability  
Enhance with:
- DLQs  
- Retry logic  
- Event archiving  

## 4. UI Features  
- Subscription timeline  
- Invoice table  
- Improved loading states  

## 5. CI/CD  
GitHub Actions for:
- Tests  
- Linting  
- Preview builds  

## 6. Observability  
Add:
- CloudWatch dashboards  
- Extended Amplitude events  

## 7. Stripe Rate Limit Handling  
- Retry backoff  
- Stale cache fallback  

---

# Setup Instructions

## Install Dependencies
```
npm install
```

## Start Amplify Sandbox
```
npx ampx sandbox
```

## Run Frontend
```
cd web
npm install
npm run dev
```

## Required Environment Variables  
Create:  
```
amplify/.env
```

Values:
```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CUSTOMER_ID=
AMPLITUDE_API_KEY=
BILLING_PORTAL_RETURN_URL=
```

---

# Testing  
Run:
```
npm run test
```

Mapper tests verify:
- Status mapping  
- Renewal period formatting  
- Fallback logic  

---

# Tradeoffs

- DynamoDB chosen over in-memory cache → persistent + scalable  
- Hardcoded Stripe customer simplifies scope  
- UI kept minimal intentionally  
- Webhook reliability not over-engineered  

---

# Deployment
```
git checkout production
git merge feature/subscription-status-viewer
git push origin production
```

---
 
# Lago Integration (Phase 1)

This document describes the initial Lago-first billing integration for Hyperscalper.

## What is implemented

- Payment verify flow now attempts to sync a manual payment to Lago after on-chain USDT verification succeeds.
- A Lago webhook endpoint is available to update local read hints for customer/subscription/payment IDs.
- Payment intent data model now stores optional Email + Wallet identity and Lago sync fields.

## Endpoints

- `POST /api/payments/arbitrum-usdt/create`
  - Supports optional `walletAddress` in request body.
- `POST /api/payments/arbitrum-usdt/verify`
  - Verifies on-chain transfer and returns `lagoSync` status.
- `GET /api/payments/arbitrum-usdt/status?orderId=...`
  - Returns Lago sync metadata fields for diagnostics.
- `POST /api/billing/lago/webhook`
  - Receives Lago webhook events and updates local read hints.

## Environment variables

Required to enable Lago sync:

- `LAGO_API_URL`
- `LAGO_API_KEY`

Optional endpoint path overrides:

- `LAGO_CUSTOMERS_CREATE_PATH` (default: `/api/v1/customers`)
- `LAGO_CUSTOMERS_UPDATE_PATH_TEMPLATE` (default: `/api/v1/customers/{externalCustomerId}`)
- `LAGO_PAYMENTS_CREATE_PATH` (default: `/api/v1/payments`)

Optional webhook signature:

- `LAGO_WEBHOOK_SECRET`

## Behavior notes

- If Lago is not configured, verify API still marks order as paid locally and reports `lagoSync.skipped=true`.
- If Lago sync fails, verify API still returns paid state but includes `lagoSync.ok=false` and stores the error in `lagoSyncError`.
- This is intentional for payment continuity; reconciliation jobs can be added next.

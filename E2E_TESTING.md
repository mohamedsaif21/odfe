# Priority 2 E2E Testing

Run these journeys after applying the database SQL in this order:

1. `supabase/seed.sql`
2. `supabase/rls_hardening.sql`
3. `supabase/e2e_journey_support.sql`

Build verification completed locally with `npm.cmd run build`.

## Admin Journey

Status: ready for live Supabase execution.

1. Register a new staff/admin account at `/register`.
2. Log in at `/login`; confirm redirect to `/dashboard`.
3. Open `/categories`; create one active category.
4. Open `/products`; create one available product in that category.
5. Open `/tables`; create a floor, create a table on that floor, and generate/show QR.
6. Open `/settings`; enable Cash, Card, UPI, and Split payment methods.
7. Open `/coupons`; create one active coupon.
8. Open `/employees`; create one cashier and one kitchen user.
9. Confirm the employee list contains the cashier and kitchen records.

Expected results:
- Admin remains scoped to one `cafe_id`.
- Payment methods are persisted in `payment_methods`.
- QR creation persists both `cafe_tables.qr_token` and `self_order_tokens`.
- Cashier/kitchen users can authenticate with the temporary passwords.

## Cashier Journey

Status: ready for live Supabase execution.

1. Log in at `/login` with the cashier account.
2. Confirm redirect to `/pos`.
3. Select the table created in the admin journey.
4. Add products to the cart.
5. Apply the active coupon.
6. Click `Send to Brew Bar`.
7. Click payment/complete sale and complete payment with an enabled method.
8. Verify:
   - `orders.status` becomes `paid`.
   - `payments.status` is `completed`.
   - The selected `cafe_tables.status` returns to `available`.
   - The order appears in `/orders` and payment appears in `/payments`.

## Kitchen Journey

Status: ready for live Supabase execution.

1. Log in at `/login` with the kitchen account.
2. Confirm redirect to `/brew-bar`.
3. Create/send an order from the cashier POS in another session.
4. Confirm the ticket appears in the `To Cook` column without manual refresh.
5. Move it to `Preparing`.
6. Move it to `Completed`.
7. Confirm the customer tracking page reflects the kitchen stage changes.

## Customer Journey

Status: ready for live Supabase execution.

1. Open the QR URL generated for the table: `/s/[token]`.
2. Register or log in through the customer flow.
3. Confirm redirect returns to `/s/[token]`.
4. Browse the active menu.
5. Add products and place the order.
6. Confirm redirect to `/customer/orders/[orderId]`.
7. Confirm the ticket appears in `/brew-bar`.
8. Move the ticket through kitchen stages and confirm the customer order timeline updates.

## Local Verification Notes

Completed:
- Production build passes with all Priority 2 UI/service changes.
- Admin-facing controls now exist for floor creation, payment method enablement, and cashier/kitchen creation.
- QR generation now creates/backfills `self_order_tokens`, which is required by `/s/[token]`.
- SQL support now includes the RPCs used by admin onboarding and employee creation.

Not completed locally:
- Live Supabase E2E execution was not run from this workspace because there is no local `psql` or Supabase CLI available to apply the SQL files to the target database.
- `npm.cmd run lint` still prompts to create a Next.js ESLint config, so it is not usable as a non-interactive check until ESLint is configured.

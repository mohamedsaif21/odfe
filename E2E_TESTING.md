# OdFe End-to-End Testing Checklist

Run after applying Supabase SQL and setting environment variables.

## Auth and Roles
- Register an admin and confirm `/dashboard` loads.
- Login as cashier and confirm `/pos` loads.
- Login as kitchen and confirm `/brew-bar` loads.
- Register a customer through a table QR link and confirm redirect returns to `/s/[token]`.

## Catalog and Storage
- Create a category.
- Create a product with an uploaded image.
- Confirm the product image renders in Products, POS, and self-order menu.

## POS to Kitchen to Payment
- Select a table in POS.
- Add products, apply a coupon, and send to Brew Bar.
- Confirm ticket appears on Brew Bar without refresh.
- Move ticket from To Cook to Preparing to Completed.
- Complete payment with cash, card, UPI, and split payment cases.
- Confirm order is marked paid and table returns available.

## Customer Self-Order
- Scan a valid QR.
- Add items, apply coupon, place order.
- Confirm redirect to `/customer/orders/[orderId]`.
- Confirm customer timeline updates when Brew Bar updates the kitchen ticket.

## Customer Display
- Open `/customer-display` as cashier/admin.
- Create an order and confirm items/totals update.
- Add a payment and confirm payment view updates.
- Complete payment and confirm thank-you state.

## Reports and Bookings
- Create several paid orders.
- Verify daily, weekly, and monthly reports.
- Export PDF and XLS.
- Create, confirm, and cancel a booking.

## Deployment
- Run `docker compose build`.
- Run `docker compose up`.
- Confirm `/api/health` returns successfully.

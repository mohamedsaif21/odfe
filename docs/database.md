# Database Schema

## Core Models

### odfe_session
- id, name, user_id, state (draft/opened/closed), opened_at, closed_at
- start_cash, end_cash, total_sales, total_orders

### odfe_order
- id, name, session_id, table_id, customer_id, employee_id
- state (draft/confirmed/paid/cancelled), total, subtotal, tax_amount
- discount_type, discount_value, note, ordered_at

### odfe_order_line
- id, order_id, product_id, quantity, price_unit, discount
- subtotal, tax_id, note

### odfe_payment
- id, order_id, payment_method_id, amount, reference
- state (pending/completed/failed/refunded), paid_at

### odfe_product
- id, name, barcode, price, cost, category_id, tax_id
- uom_id, image, available, pos_visible, kds_visible

### odfe_table
- id, name, floor_id, capacity, state (free/occupied/reserved)
- pos_x, pos_y, shape

### odfe_floor
- id, name, sequence, color

### odfe_customer
- id, name, phone, email, total_spent, visit_count
- loyalty_points, tier

### odfe_coupon
- id, code, type (percentage/fixed), value, min_order
- start_date, end_date, usage_limit, used_count

### odfe_booking
- id, customer_id, table_id, date, time_slot
- guests, state (pending/confirmed/cancelled), note

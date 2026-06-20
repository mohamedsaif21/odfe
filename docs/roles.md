# Roles & Permissions

## Roles

### Admin
- Full access to all modules
- Configuration, reports, user management
- Can close sessions, void orders, refund

### Manager
- Access to dashboard, reports
- Can manage products, employees, coupons
- Can view all sessions and orders

### Cashier
- POS terminal access
- Create orders, process payments
- Apply discounts (up to configured limit)
- Cannot edit products or view reports

### Kitchen
- KDS access only
- View orders, update order status
- No POS or payment access

### Waiter
- Floor view, table management
- Create orders for assigned tables
- No payment processing

## Record Rules

- Cashiers see only their own sessions
- Managers see all sessions in their restaurant
- Kitchen sees all orders in "confirmed" state
- Waiters see only active orders on their floor

# API Reference

## REST Endpoints

### POS Session
- `POST /api/pos/session/open` — Open a POS session
- `POST /api/pos/session/close` — Close a POS session
- `GET /api/pos/session/current` — Get current session

### Orders
- `POST /api/pos/order/create` — Create order
- `POST /api/pos/order/update` — Update order
- `GET /api/pos/order/<id>` — Get order details
- `POST /api/pos/order/cancel` — Cancel order

### Payments
- `POST /api/payment/process` — Process payment
- `GET /api/payment/methods` — List payment methods
- `POST /api/payment/refund` — Refund payment

### Products
- `GET /api/product/list` — List products
- `GET /api/product/categories` — List categories
- `GET /api/product/search` — Search products

### Tables
- `GET /api/floor/tables` — List tables
- `POST /api/floor/table/assign` — Assign table

### Customers
- `GET /api/customer/search` — Search customers
- `POST /api/customer/create` — Create customer
- `GET /api/customer/loyalty` — Get loyalty info

### Kitchen
- `GET /api/kds/orders` — Get kitchen orders
- `POST /api/kds/order/status` — Update order status

### Self-Order
- `GET /api/self/menu` — Get self-order menu
- `POST /api/self/order` — Place self-order
- `GET /api/self/order/<token>` — Get order by token

## WebSocket Events

- `order.created` — New order placed
- `order.updated` — Order status changed
- `payment.processed` — Payment completed
- `kds.item.ready` — Kitchen item ready

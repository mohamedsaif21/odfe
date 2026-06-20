# UI Flow

## POS Flow

```
Login → Select Floor → Select Table
  → Order Screen
    → Add Products (search/browse categories)
    → Cart (adjust quantities, add notes)
    → Apply Discounts/Coupons
    → Select Customer
  → Payment Screen
    → Select Payment Method (Cash/Card/UPI/QR)
    → Process Payment
  → Receipt Screen
    → Print/Email Receipt
    → New Order or Close
```

## KDS Flow

```
Kitchen Login → Live Order Board
  → New Order Card (animated entry)
  → Cook accepts → Status: "To Cook"
  → Cooking → Status: "Preparing"
  → Done → Status: "Completed"
  → Order archived after timeout
```

## Customer Display Flow

```
Idle → QR + Promotions
  → Order Placed → Order items + total
  → Payment → Amount + QR for UPI
  → Thank You → Animation
```

## Self-Order Flow

```
Scan QR → Menu Screen
  → Browse categories → Add to cart
  → View cart → Apply coupon
  → Place order → Order confirmed
  → Track status
```

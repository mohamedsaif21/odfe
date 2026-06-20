from odoo import http
from odoo.http import request
from odoo.exceptions import UserError, AccessError
import json


class PosApiController(http.Controller):

    @http.route("/api/pos/session/open", type="json", auth="user", methods=["POST"])
    def session_open(self, start_cash=0.0):
        user = request.env.user
        existing = request.env["odfe.pos.session"].search([
            ("user_id", "=", user.id),
            ("state", "=", "opened"),
        ], limit=1)
        if existing:
            return {"success": False, "message": "Session already open.", "session": existing.id}
        session = request.env["odfe.pos.session"].create({
            "user_id": user.id,
            "start_cash": start_cash,
        })
        session.action_open()
        return {"success": True, "session": session.id, "name": session.name}

    @http.route("/api/pos/session/close", type="json", auth="user", methods=["POST"])
    def session_close(self, session_id, cash_count=0.0):
        session = request.env["odfe.pos.session"].browse(session_id)
        if not session.exists():
            return {"success": False, "message": "Session not found."}
        if session.user_id.id != request.env.user.id:
            return {"success": False, "message": "Not your session."}
        pending = request.env["odfe.pos.order"].search([
            ("session_id", "=", session_id),
            ("state", "in", ("draft", "confirmed")),
        ])
        if pending:
            return {"success": False, "message": f"Close {len(pending)} pending orders first."}
        session.action_close(cash_count)
        return {"success": True, "message": "Session closed.", "session": session.id}

    @http.route("/api/pos/order/create", type="json", auth="user", methods=["POST"])
    def order_create(self, session_id, table_id=None, customer_id=None, employee_id=None, lines=None, note=None):
        if not lines:
            return {"success": False, "message": "Order must have items."}
        session = request.env["odfe.pos.session"].browse(session_id)
        if not session.exists() or session.state != "opened":
            return {"success": False, "message": "Invalid or closed session."}
        order_vals = {
            "session_id": session_id,
            "table_id": table_id,
            "customer_id": customer_id,
            "employee_id": employee_id,
            "note": note,
            "line_ids": [(0, 0, {
                "product_id": l["product_id"],
                "quantity": l.get("quantity", 1.0),
                "price_unit": l.get("price_unit", 0.0),
                "discount_type": l.get("discount_type", "percentage"),
                "discount_value": l.get("discount_value", 0.0),
                "note": l.get("note"),
                "is_modifier": l.get("is_modifier", False),
            }) for l in lines if not l.get("is_modifier")],
        }
        order = request.env["odfe.pos.order"].create(order_vals)
        for line_data in lines:
            if line_data.get("is_modifier"):
                parent_line = order.line_ids.filtered(
                    lambda l: l.product_id.id == line_data.get("parent_product_id")
                )
                if parent_line:
                    order.write({
                        "line_ids": [(0, 0, {
                            "product_id": line_data["product_id"],
                            "quantity": line_data.get("quantity", 1.0),
                            "price_unit": line_data.get("price_unit", 0.0),
                            "is_modifier": True,
                            "parent_line_id": parent_line[0].id,
                        })]
                    })
        return {"success": True, "order_id": order.id, "name": order.name}

    @http.route("/api/pos/order/get", type="json", auth="user", methods=["POST"])
    def order_get(self, order_id):
        order = request.env["odfe.pos.order"].browse(order_id)
        if not order.exists():
            return {"success": False, "message": "Order not found."}
        return {
            "success": True,
            "order": {
                "id": order.id,
                "name": order.name,
                "state": order.state,
                "subtotal": order.subtotal,
                "tax": order.tax_amount,
                "discount": order.discount_total,
                "total": order.total,
                "total_paid": order.total_paid,
                "table": order.table_id.name if order.table_id else None,
                "customer": order.customer_id.name if order.customer_id else None,
                "lines": [{
                    "id": l.id,
                    "product": l.product_name or l.product_id.name,
                    "qty": l.quantity,
                    "price": l.price_unit,
                    "subtotal": l.subtotal,
                    "modifiers": [{
                        "name": m.product_name or m.product_id.name,
                        "qty": m.quantity,
                        "price": m.price_unit,
                    } for m in order.line_ids.filtered(lambda x: x.parent_line_id.id == l.id)],
                } for l in order.line_ids if not l.is_modifier],
                "payments": [{"method": p.payment_method_id.name, "amount": p.amount} for p in order.payment_ids],
            },
        }

    @http.route("/api/pos/product/search", type="json", auth="user", methods=["POST"])
    def product_search(self, query="", category_id=None, page=1, page_size=20):
        domain = [("saleable", "=", True)]
        if query:
            domain += ["|", ("name", "ilike", query), ("code", "ilike", query)]
        if category_id:
            domain.append(("category_id", "=", category_id))
        total = request.env["odfe.product"].search_count(domain)
        products = request.env["odfe.product"].search(domain, offset=(page - 1) * page_size, limit=page_size)
        return {
            "success": True,
            "total": total,
            "page": page,
            "products": [{
                "id": p.id,
                "name": p.name,
                "code": p.code,
                "price": p.price,
                "category_id": p.category_id.id,
                "category_name": p.category_id.name,
                "image_url": p.image and f"/web/image/odfe.product/{p.id}/image" or None,
            } for p in products],
        }

    @http.route("/api/pos/customer/search", type="json", auth="user", methods=["POST"])
    def customer_search(self, query="", page=1, page_size=20):
        domain = []
        if query:
            domain = ["|", ("name", "ilike", query), ("phone", "ilike", query)]
        total = request.env["odfe.customer"].search_count(domain)
        customers = request.env["odfe.customer"].search(domain, offset=(page - 1) * page_size, limit=page_size)
        return {
            "success": True,
            "total": total,
            "customers": [{
                "id": c.id,
                "name": c.name,
                "phone": c.phone,
                "email": c.email,
                "loyalty_points": c.loyalty_points,
            } for c in customers],
        }

    @http.route("/api/pos/payment/process", type="json", auth="user", methods=["POST"])
    def payment_process(self, order_id, payments):
        order = request.env["odfe.pos.order"].browse(order_id)
        if not order.exists():
            return {"success": False, "message": "Order not found."}
        if order.state not in ("draft", "confirmed"):
            return {"success": False, "message": "Order cannot accept payments."}
        total_paid = 0.0
        for pay in payments:
            request.env["odfe.payment"].create({
                "order_id": order_id,
                "session_id": order.session_id.id,
                "payment_method_id": pay.get("method_id"),
                "amount": pay.get("amount", 0.0),
                "reference": pay.get("reference", ""),
                "state": "completed",
            })
            total_paid += pay.get("amount", 0.0)
        if total_paid >= order.total:
            order.action_pay()
        receipt = request.env["odfe.pos.receipt"].create({"order_id": order_id})
        receipt.generate_receipt_data()
        return {"success": True, "order_id": order.id, "state": order.state, "receipt_id": receipt.id}

    @http.route("/api/pos/table/list", type="json", auth="user", methods=["GET"])
    def table_list(self, floor_id=None):
        domain = [("active", "=", True)]
        if floor_id:
            domain.append(("floor_id", "=", floor_id))
        tables = request.env["odfe.table"].search(domain)
        return {
            "success": True,
            "tables": [{
                "id": t.id,
                "name": t.name,
                "capacity": t.capacity,
                "floor_id": t.floor_id.id,
                "floor_name": t.floor_id.name,
                "status": t.status,
                "x": t.x_position,
                "y": t.y_position,
            } for t in tables],
        }

    @http.route("/api/pos/cart/add", type="json", auth="user", methods=["POST"])
    def cart_add(self, session_id, table_id=None, product_id=None, quantity=1.0, modifiers=None):
        if not product_id:
            return {"success": False, "message": "Product required."}
        cart = request.env["odfe.pos.cart"].search([
            ("session_id", "=", session_id),
            ("user_id", "=", request.env.user.id),
        ], limit=1)
        if not cart:
            cart = request.env["odfe.pos.cart"].create({
                "session_id": session_id,
                "table_id": table_id,
            })
        elif table_id:
            cart.table_id = table_id
        line = cart.add_product(product_id, quantity, modifiers)
        return {
            "success": True,
            "cart_id": cart.id,
            "line_id": line.id,
            "cart": {
                "subtotal": cart.subtotal,
                "discount_total": cart.discount_total,
                "total": cart.total,
            },
        }

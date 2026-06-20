from odoo import http
from odoo.http import request
from odoo.exceptions import UserError
import json


class KdsController(http.Controller):

    @http.route("/kds/dashboard", type="http", auth="user", website=False)
    def kds_dashboard(self):
        return request.render("odfe_kds.KDSDashboard")

    @http.route("/api/kds/orders", type="json", auth="user", methods=["GET"])
    def kds_orders(self, state=None):
        domain = []
        if state:
            domain.append(("state", "=", state))
        orders = request.env["odfe.kitchen.order"].search(domain)
        return {
            "success": True,
            "orders": [_order_to_json(o) for o in orders],
        }

    @http.route("/api/kds/order/<int:order_id>/accept", type="json", auth="user", methods=["POST"])
    def kds_order_accept(self, order_id):
        order = request.env["odfe.kitchen.order"].browse(order_id)
        if not order.exists():
            return {"success": False, "message": "Order not found."}
        try:
            order.action_accept()
            return {"success": True}
        except UserError as e:
            return {"success": False, "message": str(e)}

    @http.route("/api/kds/order/<int:order_id>/start", type="json", auth="user", methods=["POST"])
    def kds_order_start(self, order_id):
        order = request.env["odfe.kitchen.order"].browse(order_id)
        if not order.exists():
            return {"success": False, "message": "Order not found."}
        try:
            order.action_start_preparing()
            return {"success": True}
        except UserError as e:
            return {"success": False, "message": str(e)}

    @http.route("/api/kds/order/<int:order_id>/complete", type="json", auth="user", methods=["POST"])
    def kds_order_complete(self, order_id):
        order = request.env["odfe.kitchen.order"].browse(order_id)
        if not order.exists():
            return {"success": False, "message": "Order not found."}
        try:
            order.action_complete()
            return {"success": True}
        except UserError as e:
            return {"success": False, "message": str(e)}

    @http.route("/api/kds/order/<int:order_id>/cancel", type="json", auth="user", methods=["POST"])
    def kds_order_cancel(self, order_id, reason=None):
        order = request.env["odfe.kitchen.order"].browse(order_id)
        if not order.exists():
            return {"success": False, "message": "Order not found."}
        try:
            order.action_cancel(reason=reason)
            return {"success": True}
        except UserError as e:
            return {"success": False, "message": str(e)}

    @http.route("/api/kds/item/<int:item_id>/start", type="json", auth="user", methods=["POST"])
    def kds_item_start(self, item_id):
        item = request.env["odfe.kitchen.item"].browse(item_id)
        if not item.exists():
            return {"success": False, "message": "Item not found."}
        try:
            item.action_start()
            return {"success": True}
        except UserError as e:
            return {"success": False, "message": str(e)}

    @http.route("/api/kds/item/<int:item_id>/complete", type="json", auth="user", methods=["POST"])
    def kds_item_complete(self, item_id):
        item = request.env["odfe.kitchen.item"].browse(item_id)
        if not item.exists():
            return {"success": False, "message": "Item not found."}
        try:
            item.action_complete()
            return {"success": True}
        except UserError as e:
            return {"success": False, "message": str(e)}

    @http.route("/api/kds/send", type="json", auth="user", methods=["POST"])
    def kds_send_to_kitchen(self, order_id):
        pos_order = request.env["odfe.pos.order"].browse(order_id)
        if not pos_order.exists():
            return {"success": False, "message": "POS Order not found."}
        kitchen_order = request.env["odfe.kitchen.order"].create_from_pos_order(pos_order)
        return {
            "success": True,
            "kitchen_order_id": kitchen_order.id,
            "name": kitchen_order.name,
        }


def _order_to_json(order):
    created = str(order.created_at) if order.created_at else ""
    return {
        "id": order.id,
        "name": order.name,
        "table_name": order.table_name or "",
        "customer_name": order.customer_name or "",
        "state": order.state,
        "priority": order.priority,
        "note": order.note or "",
        "created_at": created,
        "total_items": order.total_items,
        "completed_items": order.completed_items,
        "all_completed": order.all_completed,
        "items": [_item_to_json(i) for i in order.item_ids],
    }


def _item_to_json(item):
    return {
        "id": item.id,
        "product_name": item.product_name,
        "quantity": item.quantity,
        "price_unit": item.price_unit,
        "state": item.state,
        "preparation_time": item.preparation_time,
        "modifiers": item.modifiers or "",
        "note": item.note or "",
        "sequence": item.sequence,
        "started_at": str(item.started_at) if item.started_at else "",
        "completed_at": str(item.completed_at) if item.completed_at else "",
    }

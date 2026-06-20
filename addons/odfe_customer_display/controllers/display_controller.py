import json
from odoo import http
from odoo.http import request


class CustomerDisplayController(http.Controller):

    @http.route("/customer/display", type="http", auth="public", website=True)
    def customer_display_page(self, **kwargs):
        display_id = kwargs.get("display_id")
        if display_id:
            display = request.env["odfe.customer.display"].sudo().browse(int(display_id))
        else:
            display = request.env["odfe.customer.display"].sudo().search([], limit=1)
        if not display:
            display = request.env["odfe.customer.display"].sudo().create({
                "name": "Customer Display",
            })
        return request.render("odfe_customer_display.CustomerDisplay", {
            "display": display,
            "display_id": display.id,
        })

    @http.route("/api/customer/display/status", type="json", auth="public", methods=["GET"])
    def get_display_status(self, display_id=None):
        domain = [("id", "=", int(display_id))] if display_id else []
        display = request.env["odfe.customer.display"].sudo().search(domain, limit=1)
        if not display:
            return {"error": "Display not found", "success": False}
        return {
            "success": True,
            "id": display.id,
            "state": display.state,
            "display_text": display.display_text,
            "qr_data": display.qr_data,
            "amount_due": display.amount_due,
            "animation_data": display.animation_data,
            "order_name": display.order_id.name if display.order_id else None,
        }

    @http.route("/api/customer/display/thank-you", type="json", auth="public", methods=["POST"])
    def trigger_thank_you(self, display_id=None):
        domain = [("id", "=", int(display_id))] if display_id else []
        display = request.env["odfe.customer.display"].sudo().search(domain, limit=1)
        if not display:
            return {"error": "Display not found", "success": False}
        display.show_thank_you()
        return {"success": True, "state": "thank_you"}

    @http.route("/api/customer/display/start", type="json", auth="public", methods=["POST"])
    def start_display(self, display_id=None, order_id=None):
        domain = [("id", "=", int(display_id))] if display_id else []
        display = request.env["odfe.customer.display"].sudo().search(domain, limit=1)
        if not display:
            return {"error": "Display not found", "success": False}
        if not order_id:
            return {"error": "order_id required", "success": False}
        result = display.start_display(int(order_id))
        return {"success": result, "state": display.state}

    @http.route("/api/customer/display/payment", type="json", auth="public", methods=["POST"])
    def show_payment(self, display_id=None, qr_data=None):
        domain = [("id", "=", int(display_id))] if display_id else []
        display = request.env["odfe.customer.display"].sudo().search(domain, limit=1)
        if not display:
            return {"error": "Display not found", "success": False}
        if qr_data:
            display.write({"qr_data": qr_data})
        result = display.show_payment()
        return {"success": result, "state": "payment"}

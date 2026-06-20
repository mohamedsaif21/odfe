from odoo import api, fields, models, _
from odoo.exceptions import UserError


class PosReceipt(models.Model):
    _name = "odfe.pos.receipt"
    _description = "POS Receipt"
    _order = "id desc"

    order_id = fields.Many2one("odfe.pos.order", string="Order", required=True, ondelete="cascade")
    receipt_number = fields.Char(string="Receipt Number", required=True, copy=False, readonly=True, default=lambda self: _("New"))
    receipt_data = fields.Json(string="Receipt Data")
    printed = fields.Boolean(string="Printed", default=False)
    emailed = fields.Boolean(string="Emailed", default=False)
    printed_at = fields.Datetime(string="Printed At", readonly=True)
    emailed_at = fields.Datetime(string="Emailed At", readonly=True)
    emailed_to = fields.Char(string="Emailed To")
    content_html = fields.Html(string="Content", compute="_compute_content_html")

    @api.model
    def create(self, vals):
        if vals.get("receipt_number", _("New")) == _("New"):
            vals["receipt_number"] = self.env["ir.sequence"].next_by_code("odfe.pos.receipt") or _("New")
        return super().create(vals)

    @api.depends("receipt_data")
    def _compute_content_html(self):
        for rec in self:
            if not rec.receipt_data:
                rec.content_html = ""
                continue
            data = rec.receipt_data
            lines_html = "".join(
                f"<tr><td>{l.get('name', '')}</td><td>{l.get('qty', 0)}</td><td>{l.get('price', 0):.2f}</td></tr>"
                for l in data.get("lines", [])
            )
            rec.content_html = f"""
            <div style="font-family: monospace; max-width: 300px; margin: auto;">
                <h3 style="text-align: center;">{data.get('restaurant_name', 'Restaurant')}</h3>
                <p style="text-align: center;">{data.get('address', '')}<br/>{data.get('phone', '')}</p>
                <hr/>
                <p><b>Receipt:</b> {rec.receipt_number}<br/>
                <b>Date:</b> {data.get('date', '')}<br/>
                <b>Table:</b> {data.get('table', '')}</p>
                <hr/>
                <table style="width: 100%;">
                    <tr><th>Item</th><th>Qty</th><th>Price</th></tr>
                    {lines_html}
                </table>
                <hr/>
                <p style="text-align: right;"><b>Subtotal:</b> {data.get('subtotal', 0):.2f}<br/>
                <b>Tax:</b> {data.get('tax', 0):.2f}<br/>
                <b>Total:</b> {data.get('total', 0):.2f}</p>
                <hr/>
                <p style="text-align: center;">Thank you for dining with us!</p>
            </div>"""

    def generate_receipt_data(self):
        self.ensure_one()
        order = self.order_id
        data = {
            "restaurant_name": self.env.user.company_id.name,
            "address": self.env.user.company_id.street or "",
            "phone": self.env.user.company_id.phone or "",
            "receipt_number": self.receipt_number,
            "date": fields.Datetime.to_string(order.ordered_at or fields.Datetime.now()),
            "table": order.table_id.name if order.table_id else "Takeaway",
            "customer": order.customer_id.name if order.customer_id else "Guest",
            "employee": order.employee_id.name if order.employee_id else "",
            "lines": [],
            "subtotal": order.subtotal,
            "tax": order.tax_amount,
            "discount": order.discount_total,
            "total": order.total,
            "paid": order.total_paid,
        }
        for line in order.line_ids:
            data["lines"].append({
                "name": line.product_name or line.product_id.name,
                "qty": line.quantity,
                "price": line.price_unit,
                "subtotal": line.subtotal,
                "modifiers": [],
            })
        self.receipt_data = data
        return data

    def print_receipt(self):
        self.ensure_one()
        if not self.receipt_data:
            self.generate_receipt_data()
        self.write({
            "printed": True,
            "printed_at": fields.Datetime.now(),
        })
        return self.env.ref("odfe_pos.action_print_receipt").report_action(self)

    def email_receipt(self, email_to):
        self.ensure_one()
        if not email_to:
            raise UserError(_("Please provide an email address."))
        if not self.receipt_data:
            self.generate_receipt_data()
        template = self.env.ref("odfe_pos.email_template_receipt", raise_if_not_found=False)
        if not template:
            template = self.env["mail.template"].sudo().create({
                "name": "Receipt Email",
                "model_id": self.env["ir.model"]._get("odfe.pos.receipt").id,
                "subject": "Your Receipt {{ object.receipt_number }}",
                "body_html": "<p>Dear Customer,</p><p>Please find your receipt attached.</p>{{ object.content_html }}",
                "email_to": email_to,
            })
        self.write({
            "emailed": True,
            "emailed_at": fields.Datetime.now(),
            "emailed_to": email_to,
        })
        template.send_mail(self.id, force_send=True)
        return True

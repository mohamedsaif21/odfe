from odoo import api, fields, models, _


class CustomerDisplay(models.Model):
    _name = "odfe.customer.display"
    _description = "Customer Display"
    _rec_name = "name"
    _order = "id desc"

    name = fields.Char(string="Display Name", required=True, default=lambda self: _("New Display"))
    order_id = fields.Many2one("odfe.pos.order", string="Order", ondelete="cascade")
    state = fields.Selection([
        ("idle", "Idle"),
        ("order_placed", "Order Placed"),
        ("payment", "Payment"),
        ("thank_you", "Thank You"),
    ], string="State", default="idle", required=True)
    display_text = fields.Text(string="Display Text")
    qr_data = fields.Text(string="QR Data")
    amount_due = fields.Monetary(string="Amount Due", currency_field="currency_id")
    animation_data = fields.Json(string="Animation Data")
    currency_id = fields.Many2one("res.currency", string="Currency",
                                  default=lambda self: self.env.company.currency_id)
    company_id = fields.Many2one("res.company", string="Company",
                                 default=lambda self: self.env.company)

    def start_display(self, order_id):
        self.ensure_one()
        order = self.env["odfe.pos.order"].browse(order_id)
        if not order.exists():
            return False
        self.write({
            "order_id": order_id,
            "state": "order_placed",
            "display_text": _("Order #{} placed").format(order.name),
            "amount_due": order.total,
            "animation_data": {
                "lines": [
                    {
                        "product_name": line.product_name,
                        "quantity": line.quantity,
                        "price_unit": line.price_unit,
                        "subtotal": line.subtotal,
                    }
                    for line in order.line_ids
                ],
                "subtotal": order.subtotal,
                "tax_amount": order.tax_amount,
                "total": order.total,
                "order_name": order.name,
            },
        })
        return True

    def show_payment(self):
        self.ensure_one()
        if not self.order_id:
            return False
        self.write({
            "state": "payment",
            "display_text": _("Please scan to pay"),
            "amount_due": self.order_id.total,
        })
        return True

    def show_thank_you(self):
        self.ensure_one()
        self.write({
            "state": "thank_you",
            "display_text": _("Thank you!"),
        })
        self._schedule_idle_transition()

    def _schedule_idle_transition(self):
        self.ensure_one()
        # Use a delayed action to return to idle after 10 seconds
        now = fields.Datetime.now()
        action = self.env["ir.actions.server"].sudo().create({
            "name": _("Customer Display Idle Transition - %s") % self.name,
            "model_id": self.env["ir.model"]._get("odfe.customer.display").id,
            "state": "code",
            "code": "records.browse(%s).write({'state': 'idle', 'display_text': '', 'order_id': False, 'qr_data': False, 'amount_due': 0, 'animation_data': False})" % self.id,
        })
        self.env["ir.cron"].sudo().create({
            "name": _("Display Idle Timer - %s") % self.name,
            "model_id": self.env["ir.model"]._get("odfe.customer.display").id,
            "state": "code",
            "code": "records.browse(%s).sudo()._run_idle_transition(%s)" % (self.id, action.id),
            "numbercall": 1,
            "doall": False,
            "interval_number": 10,
            "interval_type": "seconds",
            "nextcall": fields.Datetime.add(now, seconds=10),
            "active": True,
        })

    def _run_idle_transition(self, action_id):
        self.ensure_one()
        action = self.env["ir.actions.server"].browse(action_id)
        if action.exists():
            action.run()
            action.cron_id.unlink()
            action.unlink()
        else:
            self.write({
                "state": "idle",
                "display_text": "",
                "order_id": False,
                "qr_data": False,
                "amount_due": 0,
                "animation_data": False,
            })

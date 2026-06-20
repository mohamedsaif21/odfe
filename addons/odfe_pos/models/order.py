from odoo import api, fields, models, _
from odoo.exceptions import UserError


class PosOrder(models.Model):
    _name = "odfe.pos.order"
    _description = "POS Order"
    _order = "id desc"
    _inherit = ["mail.thread", "mail.activity.mixin"]

    name = fields.Char(string="Order", required=True, copy=False, readonly=True, default=lambda self: _("New"))
    session_id = fields.Many2one("odfe.pos.session", string="Session", required=True, ondelete="restrict")
    table_id = fields.Many2one("odfe.table", string="Table", ondelete="restrict")
    customer_id = fields.Many2one("odfe.customer", string="Customer", ondelete="restrict")
    employee_id = fields.Many2one("odfe.employee", string="Employee", ondelete="restrict")
    state = fields.Selection([
        ("draft", "Draft"),
        ("confirmed", "Confirmed"),
        ("paid", "Paid"),
        ("cancelled", "Cancelled"),
        ("refunded", "Refunded"),
    ], string="State", default="draft", required=True, tracking=True)
    line_ids = fields.One2many("odfe.pos.order.line", "order_id", string="Order Lines", copy=True)
    payment_ids = fields.One2many("odfe.payment", "order_id", string="Payments")

    subtotal = fields.Monetary(string="Subtotal", compute="_compute_line_totals", store=True, currency_field="currency_id")
    tax_amount = fields.Monetary(string="Tax", compute="_compute_line_totals", store=True, currency_field="currency_id")
    total = fields.Monetary(string="Total", compute="_compute_line_totals", store=True, currency_field="currency_id")
    discount_ids = fields.One2many("odfe.order.discount", "order_id", string="Discounts")
    coupon_id = fields.Many2one("odfe.coupon", string="Coupon", ondelete="restrict")
    discount_total = fields.Monetary(string="Discount Total", compute="_compute_line_totals", store=True, currency_field="currency_id")
    total_paid = fields.Monetary(string="Total Paid", compute="_compute_paid", store=True, currency_field="currency_id")

    note = fields.Text(string="Note")
    internal_note = fields.Text(string="Internal Note")
    ordered_at = fields.Datetime(string="Ordered At", default=fields.Datetime.now)
    paid_at = fields.Datetime(string="Paid At", readonly=True)
    pos_reference = fields.Char(string="POS Reference", copy=False, readonly=True)

    currency_id = fields.Many2one("res.currency", related="company_id.currency_id", string="Currency")
    company_id = fields.Many2one("res.company", string="Company", default=lambda self: self.env.company)

    @api.model
    def create(self, vals):
        if vals.get("name", _("New")) == _("New"):
            vals["name"] = self.env["ir.sequence"].next_by_code("odfe.pos.order") or _("New")
        if not vals.get("pos_reference"):
            vals["pos_reference"] = vals.get("name", _("New"))
        order = super().create(vals)
        order._log_history("create")
        return order

    def write(self, vals):
        res = super().write(vals)
        if vals:
            for order in self:
                for field, value in vals.items():
                    if field in ("write_date", "write_uid"):
                        continue
                    old_val = order._fields.get(field) and str(order._fields[field].convert_to_cache(order[field], order))
                    order._log_history("update", field, old_val, str(value))
        return res

    @api.depends("line_ids.subtotal", "line_ids.tax_amount", "line_ids.discount_amount", "discount_ids.amount", "coupon_id")
    def _compute_line_totals(self):
        for order in self:
            order.subtotal = sum(order.line_ids.mapped("subtotal"))
            order.tax_amount = sum(order.line_ids.mapped("tax_amount"))
            disc = sum(order.discount_ids.mapped("amount"))
            if order.coupon_id:
                disc += order.coupon_id.discount_value
            order.discount_total = disc
            order.total = order.subtotal + order.tax_amount - order.discount_total

    @api.depends("payment_ids", "payment_ids.amount")
    def _compute_paid(self):
        for order in self:
            order.total_paid = sum(order.payment_ids.mapped("amount"))

    def action_confirm(self):
        self.ensure_one()
        if self.state != "draft":
            raise UserError(_("Only draft orders can be confirmed."))
        self.write({"state": "confirmed"})

    def action_pay(self):
        self.ensure_one()
        if self.state not in ("draft", "confirmed"):
            raise UserError(_("Only confirmed orders can be paid."))
        self.write({
            "state": "paid",
            "paid_at": fields.Datetime.now(),
        })

    def action_cancel(self, reason=None):
        self.ensure_one()
        if self.state == "cancelled":
            raise UserError(_("Order is already cancelled."))
        self.write({
            "state": "cancelled",
            "note": reason if reason else self.note,
        })

    def action_refund(self):
        self.ensure_one()
        if self.state != "paid":
            raise UserError(_("Only paid orders can be refunded."))
        refund = self.copy({
            "state": "refunded",
            "name": self.env["ir.sequence"].next_by_code("odfe.pos.order") or _("Refund"),
            "pos_reference": False,
            "ordered_at": fields.Datetime.now(),
        })
        for line in refund.line_ids:
            line.quantity = -line.quantity
        refund._log_history("refund")
        self.write({"state": "refunded"})
        return refund

    def _log_history(self, action_type, field_name=None, old_value=None, new_value=None):
        self.env["odfe.pos.order.history"].log_change(
            self, action_type, field_name, old_value, new_value, self.env.user
        )

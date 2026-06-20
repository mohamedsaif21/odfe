from odoo import api, fields, models, _
from odoo.exceptions import UserError


class PosSession(models.Model):
    _name = "odfe.pos.session"
    _description = "POS Session"
    _order = "id desc"

    name = fields.Char(string="Session", required=True, copy=False, readonly=True, default=lambda self: _("New"))
    user_id = fields.Many2one("res.users", string="User", required=True, default=lambda self: self.env.user)
    state = fields.Selection([
        ("draft", "Draft"),
        ("opened", "Opened"),
        ("closed", "Closed"),
    ], string="State", default="draft", required=True, tracking=True)
    opened_at = fields.Datetime(string="Opened At", readonly=True)
    closed_at = fields.Datetime(string="Closed At", readonly=True)
    start_cash = fields.Monetary(string="Starting Cash", currency_field="company_currency_id")
    end_cash = fields.Monetary(string="Ending Cash", currency_field="company_currency_id")
    total_sales = fields.Monetary(string="Total Sales", compute="_compute_totals", store=True, currency_field="company_currency_id")
    total_orders = fields.Integer(string="Total Orders", compute="_compute_totals", store=True)
    order_ids = fields.One2many("odfe.pos.order", "session_id", string="Orders")
    payment_ids = fields.One2many("odfe.payment", "session_id", string="Payments")
    notes = fields.Text(string="Notes")
    company_currency_id = fields.Many2one("res.currency", related="company_id.currency_id", string="Currency")
    company_id = fields.Many2one("res.company", string="Company", default=lambda self: self.env.company)

    @api.model
    def create(self, vals):
        if vals.get("name", _("New")) == _("New"):
            vals["name"] = self.env["ir.sequence"].next_by_code("odfe.pos.session") or _("New")
        return super().create(vals)

    def action_open(self):
        self.ensure_one()
        if self.state != "draft":
            raise UserError(_("Session can only be opened from Draft state."))
        self.write({
            "state": "opened",
            "opened_at": fields.Datetime.now(),
        })
        return True

    def action_close(self, cash_count=None):
        self.ensure_one()
        if self.state != "opened":
            raise UserError(_("Session can only be closed from Opened state."))
        vals = {
            "state": "closed",
            "closed_at": fields.Datetime.now(),
        }
        if cash_count is not None:
            vals["end_cash"] = cash_count
        self.write(vals)
        return True

    @api.depends("order_ids", "order_ids.state", "order_ids.total")
    def _compute_totals(self):
        for session in self:
            orders = session.order_ids.filtered(lambda o: o.state in ("paid", "refunded"))
            session.total_sales = sum(orders.mapped("total"))
            session.total_orders = len(orders)

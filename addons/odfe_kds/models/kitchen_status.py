from odoo import api, fields, models


class KitchenStatus(models.Model):
    _name = "odfe.kitchen.status"
    _description = "Kitchen Order Status Log"
    _order = "created_at desc"

    kitchen_order_id = fields.Many2one("odfe.kitchen.order", string="Kitchen Order", required=True, ondelete="cascade")
    state_from = fields.Char(string="From State")
    state_to = fields.Char(string="To State", required=True)
    changed_by = fields.Many2one("res.users", string="Changed By", required=True)
    changed_at = fields.Datetime(string="Changed At", default=fields.Datetime.now, required=True)
    duration_seconds = fields.Integer(string="Duration (s)", compute="_compute_duration", store=True)

    @api.depends("changed_at")
    def _compute_duration(self):
        for rec in self:
            if rec.changed_at:
                prev = self.search([
                    ("kitchen_order_id", "=", rec.kitchen_order_id.id),
                    ("id", "<", rec.id),
                ], order="id desc", limit=1)
                if prev and prev.changed_at:
                    delta = rec.changed_at - prev.changed_at
                    rec.duration_seconds = int(delta.total_seconds())
                else:
                    rec.duration_seconds = 0
            else:
                rec.duration_seconds = 0

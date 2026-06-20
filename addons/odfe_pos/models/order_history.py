from odoo import api, fields, models, _


class PosOrderHistory(models.Model):
    _name = "odfe.pos.order.history"
    _description = "POS Order History"
    _order = "changed_at desc, id desc"

    order_id = fields.Many2one("odfe.pos.order", string="Order", required=True, ondelete="cascade")
    field_name = fields.Char(string="Field")
    old_value = fields.Text(string="Old Value")
    new_value = fields.Text(string="New Value")
    changed_by = fields.Many2one("res.users", string="Changed By", required=True, default=lambda self: self.env.user)
    changed_at = fields.Datetime(string="Changed At", default=fields.Datetime.now, required=True)
    type = fields.Selection([
        ("create", "Created"),
        ("update", "Updated"),
        ("delete", "Deleted"),
        ("payment", "Payment"),
        ("cancel", "Cancelled"),
        ("refund", "Refunded"),
    ], string="Type", required=True, default="update")

    @api.model
    def log_change(self, order, action_type, field_name=None, old_value=None, new_value=None, user=None):
        if isinstance(order, int):
            order = self.env["odfe.pos.order"].browse(order)
        self.create({
            "order_id": order.id,
            "type": action_type,
            "field_name": field_name,
            "old_value": old_value,
            "new_value": new_value,
            "changed_by": user.id if user else self.env.user.id,
            "changed_at": fields.Datetime.now(),
        })
        return True

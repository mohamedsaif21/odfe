import json
from odoo import api, fields, models, _
from odoo.exceptions import UserError


class KitchenItem(models.Model):
    _name = "odfe.kitchen.item"
    _description = "Kitchen Order Item"
    _order = "sequence, id"

    kitchen_order_id = fields.Many2one("odfe.kitchen.order", string="Kitchen Order", required=True, ondelete="cascade")
    pos_order_line_id = fields.Many2one("odfe.pos.order.line", string="POS Order Line", ondelete="set null")
    product_name = fields.Char(string="Product Name", required=True)
    quantity = fields.Float(string="Quantity", default=1.0, required=True)
    price_unit = fields.Float(string="Unit Price", default=0.0)
    state = fields.Selection([
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("preparing", "Preparing"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ], string="State", default="pending", required=True)
    preparation_time = fields.Float(string="Preparation Time (min)", default=0.0)
    started_at = fields.Datetime(string="Started At", readonly=True)
    completed_at = fields.Datetime(string="Completed At", readonly=True)
    modifiers = fields.Text(string="Modifiers", help="JSON string of modifiers")
    note = fields.Text(string="Note")
    sequence = fields.Integer(string="Sequence", default=10)

    def action_accept(self):
        for item in self:
            if item.state == "pending":
                item.write({"state": "accepted"})

    def action_start(self):
        for item in self:
            if item.state in ("pending", "accepted"):
                item.write({
                    "state": "preparing",
                    "started_at": fields.Datetime.now(),
                })

    def action_complete(self):
        for item in self:
            if item.state not in ("completed", "cancelled"):
                item.write({
                    "state": "completed",
                    "completed_at": fields.Datetime.now(),
                })

    def action_cancel(self):
        for item in self:
            if item.state not in ("cancelled", "completed"):
                item.write({"state": "cancelled"})

    @api.depends("modifiers")
    def _compute_modifier_list(self):
        for item in self:
            if item.modifiers:
                try:
                    item.modifier_list = json.loads(item.modifiers)
                except (json.JSONDecodeError, TypeError):
                    item.modifier_list = []
            else:
                item.modifier_list = []

    modifier_list = fields.Text(string="Modifier List", compute="_compute_modifier_list")

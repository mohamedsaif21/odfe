from odoo import api, fields, models, _
from odoo.exceptions import UserError


class KitchenOrder(models.Model):
    _name = "odfe.kitchen.order"
    _description = "Kitchen Order"
    _order = "priority desc, id desc"
    _inherit = ["mail.thread", "mail.activity.mixin"]

    name = fields.Char(string="Order Reference", required=True, copy=False, readonly=True)
    pos_order_id = fields.Many2one("odfe.pos.order", string="POS Order", required=True, ondelete="cascade")
    table_name = fields.Char(string="Table", related="pos_order_id.table_id.name", store=True, readonly=True)
    customer_name = fields.Char(string="Customer", related="pos_order_id.customer_id.name", store=True, readonly=True)
    item_ids = fields.One2many("odfe.kitchen.item", "kitchen_order_id", string="Items")
    state = fields.Selection([
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("preparing", "Preparing"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ], string="State", default="pending", required=True, tracking=True)
    priority = fields.Selection([
        ("normal", "Normal"),
        ("urgent", "Urgent"),
    ], string="Priority", default="normal", required=True)
    note = fields.Text(string="Note")
    created_at = fields.Datetime(string="Created At", default=fields.Datetime.now, readonly=True)
    started_at = fields.Datetime(string="Started At", readonly=True)
    completed_at = fields.Datetime(string="Completed At", readonly=True)
    total_items = fields.Integer(string="Total Items", compute="_compute_counts", store=True)
    completed_items = fields.Integer(string="Completed Items", compute="_compute_counts", store=True)
    all_completed = fields.Boolean(string="All Completed", compute="_compute_counts", store=True)

    @api.depends("item_ids.state")
    def _compute_counts(self):
        for order in self:
            items = order.item_ids
            order.total_items = len(items)
            order.completed_items = len(items.filtered(lambda i: i.state in ("completed", "cancelled")))
            order.all_completed = order.total_items > 0 and order.completed_items >= order.total_items

    def action_accept(self):
        self.ensure_one()
        if self.state != "pending":
            raise UserError(_("Only pending orders can be accepted."))
        self.write({
            "state": "accepted",
            "started_at": fields.Datetime.now(),
        })
        self.item_ids.write({"state": "accepted"})
        self._log_status("accepted")

    def action_start_preparing(self):
        self.ensure_one()
        if self.state not in ("pending", "accepted"):
            raise UserError(_("Order must be accepted before preparing."))
        self.write({
            "state": "preparing",
            "started_at": self.started_at or fields.Datetime.now(),
        })
        self.item_ids.filtered(lambda i: i.state in ("pending", "accepted")).write({"state": "preparing"})
        self._log_status("preparing")

    def action_complete(self):
        self.ensure_one()
        if self.state == "completed":
            raise UserError(_("Order is already completed."))
        self.write({
            "state": "completed",
            "completed_at": fields.Datetime.now(),
        })
        self.item_ids.filtered(lambda i: i.state != "cancelled").write({"state": "completed"})
        self._log_status("completed")

    def action_cancel(self, reason=None):
        self.ensure_one()
        if self.state == "cancelled":
            raise UserError(_("Order is already cancelled."))
        self.write({
            "state": "cancelled",
            "note": reason or self.note,
        })
        self.item_ids.write({"state": "cancelled"})
        self._log_status("cancelled")

    def _log_status(self, new_state):
        self.env["odfe.kitchen.status"].create({
            "kitchen_order_id": self.id,
            "state_from": self._prior_state(new_state),
            "state_to": new_state,
            "changed_by": self.env.user.id,
        })

    def _prior_state(self, new_state):
        seq = ["pending", "accepted", "preparing", "completed", "cancelled"]
        idx = seq.index(new_state)
        return seq[idx - 1] if idx > 0 else ""

    @api.model
    def create_from_pos_order(self, pos_order):
        existing = self.search([("pos_order_id", "=", pos_order.id)], limit=1)
        if existing:
            return existing
        vals = {
            "name": pos_order.name,
            "pos_order_id": pos_order.id,
            "note": pos_order.note,
            "priority": "urgent" if pos_order.note else "normal",
            "item_ids": [],
        }
        for line in pos_order.line_ids.filtered(lambda l: not l.is_modifier):
            modifiers = pos_order.line_ids.filtered(lambda m: m.parent_line_id.id == line.id)
            vals["item_ids"] += [(0, 0, {
                "pos_order_line_id": line.id,
                "product_name": line.product_name or line.product_id.name,
                "quantity": line.quantity,
                "price_unit": line.price_unit,
                "modifiers": _serialize_modifiers(modifiers),
                "preparation_time": line.product_id.preparation_time if hasattr(line.product_id, "preparation_time") else 0.0,
                "note": line.note,
                "sequence": line.sequence,
            })]
        order = self.create(vals)
        order._log_status("pending")
        return order


def _serialize_modifiers(modifier_lines):
    import json
    data = [{"name": m.product_name or m.product_id.name, "quantity": m.quantity} for m in modifier_lines]
    return json.dumps(data) if data else ""

from odoo import api, fields, models, _


class CartLine(models.Model):
    _name = "odfe.pos.cart.line"
    _description = "Cart Line"
    _rec_name = "product_name"

    cart_id = fields.Many2one("odfe.pos.cart", string="Cart", required=True, ondelete="cascade")
    product_id = fields.Many2one("odfe.product", string="Product", required=True, ondelete="restrict")
    product_name = fields.Char(string="Product Name")
    quantity = fields.Float(string="Quantity", default=1.0, required=True)
    price_unit = fields.Monetary(string="Unit Price", currency_field="currency_id")
    discount_type = fields.Selection([
        ("percentage", "Percentage"),
        ("fixed", "Fixed"),
    ], string="Discount Type", default="percentage")
    discount_value = fields.Float(string="Discount Value", default=0.0)
    note = fields.Text(string="Note")
    is_modifier = fields.Boolean(string="Is Modifier", default=False)
    parent_line_id = fields.Many2one("odfe.pos.cart.line", string="Parent Line", ondelete="cascade")

    currency_id = fields.Many2one("res.currency", related="cart_id.currency_id", string="Currency")

    @api.depends("quantity", "price_unit")
    def _compute_subtotal(self):
        for line in self:
            line.price_subtotal = line.quantity * line.price_unit

    price_subtotal = fields.Monetary(string="Subtotal", compute="_compute_subtotal", store=True, currency_field="currency_id")


class PosCart(models.Model):
    _name = "odfe.pos.cart"
    _description = "POS Cart"
    _rec_name = "session_id"

    session_id = fields.Many2one("odfe.pos.session", string="Session", required=True, ondelete="cascade")
    user_id = fields.Many2one("res.users", string="User", default=lambda self: self.env.user)
    table_id = fields.Many2one("odfe.table", string="Table", ondelete="restrict")
    line_ids = fields.One2many("odfe.pos.cart.line", "cart_id", string="Cart Lines")
    customer_id = fields.Many2one("odfe.customer", string="Customer", ondelete="restrict")
    coupon_id = fields.Many2one("odfe.coupon", string="Coupon", ondelete="restrict")

    subtotal = fields.Monetary(string="Subtotal", compute="_compute_totals", store=True, currency_field="currency_id")
    tax_amount = fields.Monetary(string="Tax", compute="_compute_totals", store=True, currency_field="currency_id")
    discount_total = fields.Monetary(string="Discount", compute="_compute_totals", store=True, currency_field="currency_id")
    total = fields.Monetary(string="Total", compute="_compute_totals", store=True, currency_field="currency_id")

    currency_id = fields.Many2one("res.currency", related="session_id.company_id.currency_id", string="Currency")
    company_id = fields.Many2one("res.company", related="session_id.company_id", string="Company")

    @api.depends("line_ids", "line_ids.price_subtotal", "coupon_id")
    def _compute_totals(self):
        for cart in self:
            lines = cart.line_ids
            cart.subtotal = sum(lines.mapped("price_subtotal"))
            cart.tax_amount = 0.0
            cart.discount_total = 0.0
            if cart.coupon_id:
                cart.discount_total = cart.coupon_id.discount_value
            cart.total = cart.subtotal - cart.discount_total

    def add_product(self, product_id, quantity=1.0, modifiers=None):
        self.ensure_one()
        product = self.env["odfe.product"].browse(product_id)
        existing = self.line_ids.filtered(lambda l: l.product_id.id == product_id and not l.is_modifier)
        if existing:
            existing.quantity += quantity
            line = existing
        else:
            line = self.env["odfe.pos.cart.line"].create({
                "cart_id": self.id,
                "product_id": product_id,
                "product_name": product.name,
                "quantity": quantity,
                "price_unit": product.price,
            })
        if modifiers:
            for mod in modifiers:
                self.env["odfe.pos.cart.line"].create({
                    "cart_id": self.id,
                    "product_id": mod.get("product_id"),
                    "product_name": mod.get("name", ""),
                    "quantity": mod.get("quantity", 1.0),
                    "price_unit": mod.get("price", 0.0),
                    "is_modifier": True,
                    "parent_line_id": line.id,
                })
        self._compute_totals()
        return line

    def update_line(self, line_id, quantity):
        self.ensure_one()
        line = self.env["odfe.pos.cart.line"].browse(line_id)
        if line.cart_id.id != self.id:
            return False
        if quantity <= 0:
            line.unlink()
        else:
            line.quantity = quantity
        self._compute_totals()
        return True

    def remove_line(self, line_id):
        self.ensure_one()
        line = self.env["odfe.pos.cart.line"].browse(line_id)
        if line.cart_id.id == self.id:
            modifiers = self.line_ids.filtered(lambda l: l.parent_line_id.id == line_id)
            modifiers.unlink()
            line.unlink()
        self._compute_totals()
        return True

    def apply_coupon(self, code):
        self.ensure_one()
        coupon = self.env["odfe.coupon"].search([("code", "=", code), ("active", "=", True)], limit=1)
        if not coupon:
            return {"success": False, "message": _("Invalid coupon code.")}
        self.coupon_id = coupon
        self._compute_totals()
        return {"success": True, "message": _("Coupon applied."), "discount": coupon.discount_value}

    def clear(self):
        self.ensure_one()
        self.line_ids.unlink()
        self.coupon_id = False
        self.customer_id = False
        self.table_id = False
        self._compute_totals()
        return True

    def to_order(self):
        self.ensure_one()
        if not self.line_ids:
            return False
        order = self.env["odfe.pos.order"].create({
            "session_id": self.session_id.id,
            "table_id": self.table_id.id if self.table_id else False,
            "customer_id": self.customer_id.id if self.customer_id else False,
            "coupon_id": self.coupon_id.id if self.coupon_id else False,
            "line_ids": [(0, 0, {
                "product_id": l.product_id.id,
                "product_name": l.product_name,
                "quantity": l.quantity,
                "price_unit": l.price_unit,
                "discount_type": l.discount_type,
                "discount_value": l.discount_value,
                "note": l.note,
                "is_modifier": l.is_modifier,
                "parent_line_id": False,
            }) for l in self.line_ids if not l.is_modifier],
        })
        for modifier_line in self.line_ids.filtered("is_modifier"):
            parent_name = modifier_line.parent_line_id.product_name
            parent_line = order.line_ids.filtered(lambda l: l.product_name == parent_name)
            if parent_line:
                modifier_line.copy({"order_id": order.id, "parent_line_id": parent_line[0].id})
        self.clear()
        return order

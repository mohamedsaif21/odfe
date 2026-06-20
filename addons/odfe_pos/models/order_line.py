from odoo import api, fields, models, _
from odoo.exceptions import ValidationError


class PosOrderLine(models.Model):
    _name = "odfe.pos.order.line"
    _description = "POS Order Line"
    _order = "sequence, id"

    order_id = fields.Many2one("odfe.pos.order", string="Order", required=True, ondelete="cascade")
    product_id = fields.Many2one("odfe.product", string="Product", required=True, ondelete="restrict")
    product_name = fields.Char(string="Product Name", compute="_compute_product_info", store=True)
    product_code = fields.Char(string="Product Code", compute="_compute_product_info", store=True)
    quantity = fields.Float(string="Quantity", default=1.0, required=True)
    price_unit = fields.Monetary(string="Unit Price", currency_field="currency_id", required=True)
    price_subtotal = fields.Monetary(string="Price Subtotal", compute="_compute_amounts", store=True, currency_field="currency_id")

    discount_type = fields.Selection([
        ("percentage", "Percentage"),
        ("fixed", "Fixed"),
    ], string="Discount Type", default="percentage")
    discount_value = fields.Float(string="Discount Value", default=0.0)
    discount_amount = fields.Monetary(string="Discount Amount", compute="_compute_amounts", store=True, currency_field="currency_id")

    tax_id = fields.Many2one("odfe.product.tax", string="Tax", ondelete="restrict")
    tax_amount = fields.Monetary(string="Tax Amount", compute="_compute_amounts", store=True, currency_field="currency_id")

    subtotal = fields.Monetary(string="Subtotal", compute="_compute_amounts", store=True, currency_field="currency_id")

    note = fields.Text(string="Note")
    sequence = fields.Integer(string="Sequence", default=10)
    is_modifier = fields.Boolean(string="Is Modifier", default=False)
    parent_line_id = fields.Many2one("odfe.pos.order.line", string="Parent Line", ondelete="cascade")

    currency_id = fields.Many2one("res.currency", related="order_id.currency_id", string="Currency")

    @api.depends("product_id")
    def _compute_product_info(self):
        for line in self:
            if line.product_id:
                line.product_name = line.product_id.name
                line.product_code = line.product_id.code or ""
            else:
                line.product_name = ""
                line.product_code = ""

    @api.depends("quantity", "price_unit", "discount_type", "discount_value", "tax_id", "tax_id.rate")
    def _compute_amounts(self):
        for line in self:
            line.price_subtotal = line.quantity * line.price_unit

            if line.discount_type == "percentage":
                line.discount_amount = line.price_subtotal * (line.discount_value / 100.0)
            else:
                line.discount_amount = min(line.discount_value, line.price_subtotal)

            if line.tax_id:
                taxable = line.price_subtotal - line.discount_amount
                line.tax_amount = taxable * (line.tax_id.rate / 100.0)
            else:
                line.tax_amount = 0.0

            line.subtotal = line.price_subtotal - line.discount_amount + line.tax_amount

    @api.constrains("quantity")
    def _check_quantity(self):
        for line in self:
            if not line.is_modifier and line.quantity == 0:
                raise ValidationError(_("Quantity cannot be zero."))

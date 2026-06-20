from odoo import api, fields, models


class OdfeProductDiscount(models.Model):
    _name = 'odfe.product.discount'
    _description = 'Product Line Discount'
    _order = 'id'

    product_id = fields.Many2one('odfe.product', string='Product', ondelete='cascade')
    line_id = fields.Many2one(
        'odfe.pos.order.line',
        string='Order Line',
        ondelete='cascade',
        index=True,
    )
    name = fields.Char(string='Description', required=True)
    type = fields.Selection(
        [('percentage', 'Percentage'), ('fixed', 'Fixed')],
        string='Discount Type',
        required=True,
        default='percentage',
    )
    value = fields.Float(string='Value', required=True)
    amount = fields.Monetary(
        string='Amount',
        currency_field='currency_id',
        compute='_compute_amount',
        store=True,
    )
    reason = fields.Char(string='Reason')
    authorized_by = fields.Many2one('res.users', string='Authorized By', default=lambda self: self.env.user)
    company_id = fields.Many2one('res.company', related='line_id.order_id.company_id', store=True)
    currency_id = fields.Many2one('res.currency', related='company_id.currency_id', readonly=True)

    @api.depends('line_id', 'line_id.price_subtotal', 'value', 'type')
    def _compute_amount(self):
        for rec in self:
            if not rec.line_id:
                rec.amount = 0.0
                continue
            line_total = rec.line_id.price_subtotal
            if rec.type == 'percentage':
                rec.amount = line_total * (rec.value / 100.0)
            else:
                rec.amount = min(rec.value, line_total)

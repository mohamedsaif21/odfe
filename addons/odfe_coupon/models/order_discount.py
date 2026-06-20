from odoo import api, fields, models


class OdfeOrderDiscount(models.Model):
    _name = 'odfe.order.discount'
    _description = 'Order Discount'
    _order = 'id'

    order_id = fields.Many2one(
        'odfe.pos.order',
        string='Order',
        ondelete='cascade',
        required=True,
        index=True,
    )
    name = fields.Char(string='Description', required=True)
    type = fields.Selection(
        [('coupon', 'Coupon'), ('promotion', 'Promotion'), ('manual', 'Manual')],
        string='Discount Source',
        required=True,
        default='manual',
    )
    discount_type = fields.Selection(
        [('percentage', 'Percentage'), ('fixed', 'Fixed')],
        string='Discount Calculation',
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
    coupon_id = fields.Many2one('odfe.coupon', string='Coupon', ondelete='set null')
    promotion_id = fields.Many2one('odfe.promotion', string='Promotion', ondelete='set null')
    user_id = fields.Many2one('res.users', string='Authorized By', default=lambda self: self.env.user)
    company_id = fields.Many2one('res.company', related='order_id.company_id', store=True)
    currency_id = fields.Many2one('res.currency', related='company_id.currency_id', readonly=True)

    @api.depends('order_id', 'order_id.total', 'value', 'discount_type')
    def _compute_amount(self):
        for rec in self:
            if not rec.order_id:
                rec.amount = 0.0
                continue
            order_total = rec.order_id.total
            if rec.discount_type == 'percentage':
                rec.amount = order_total * (rec.value / 100.0)
            else:
                rec.amount = rec.value

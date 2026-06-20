from odoo import api, fields, models, _
from odoo.exceptions import ValidationError


class OdpePromotion(models.Model):
    _name = 'odfe.promotion'
    _description = 'Promotion'
    _order = 'name'

    name = fields.Char(required=True)
    active = fields.Boolean(default=True)
    type = fields.Selection(
        [
            ('buy_x_get_y', 'Buy X Get Y'),
            ('percentage_off', 'Percentage Off'),
            ('fixed_amount', 'Fixed Amount Off'),
            ('bundle', 'Bundle'),
        ],
        string='Promotion Type',
        required=True,
        default='percentage_off',
    )
    condition_product_ids = fields.Many2many(
        'product.product',
        'promotion_condition_product_rel',
        'promotion_id',
        'product_id',
        string='Condition Products',
        help='Products that trigger this promotion.',
    )
    condition_quantity = fields.Integer(
        string='Minimum Quantity',
        default=1,
        help='Minimum quantity of condition products required.',
    )
    discount_percent = fields.Float(
        string='Discount Percentage',
        help='Percentage discount (for percentage_off type).',
    )
    discount_amount = fields.Monetary(
        string='Discount Amount',
        currency_field='currency_id',
        help='Fixed discount amount (for fixed_amount type).',
    )
    min_purchase = fields.Monetary(
        string='Minimum Purchase',
        currency_field='currency_id',
        help='Minimum order total required.',
    )
    applicable_product_ids = fields.Many2many(
        'product.product',
        'promotion_applicable_product_rel',
        'promotion_id',
        'product_id',
        string='Applicable Products',
        help='Products the discount applies to. Leave empty to apply to all.',
    )
    date_start = fields.Datetime(string='Start Date')
    date_end = fields.Datetime(string='End Date')
    company_id = fields.Many2one('res.company', default=lambda self: self.env.company)
    currency_id = fields.Many2one('res.currency', related='company_id.currency_id', readonly=True)
    sequence = fields.Integer(default=10)

    _sql_constraints = [
        ('check_percent_range', 'CHECK(discount_percent >= 0 AND discount_percent <= 100)',
         'Discount percentage must be between 0 and 100.'),
    ]

    @api.constrains('date_start', 'date_end')
    def _check_dates(self):
        for r in self:
            if r.date_start and r.date_end and r.date_start >= r.date_end:
                raise ValidationError(_('Promotion start date must be before end date.'))

    def get_applicable_promotions(self, order_lines):
        self.ensure_one()
        if not self.active:
            return []
        now = fields.Datetime.now()
        if self.date_start and now < self.date_start:
            return []
        if self.date_end and now > self.date_end:
            return []
        if self.min_purchase > 0:
            total = sum(line.get('price_subtotal', 0.0) for line in order_lines)
            if total < self.min_purchase:
                return []
        if self.type == 'buy_x_get_y' and self.condition_product_ids:
            matching = [
                l for l in order_lines
                if l.get('product_id') in self.condition_product_ids.ids
            ]
            total_qty = sum(l.get('qty', 0.0) for l in matching)
            if total_qty < self.condition_quantity:
                return []
        return [self]

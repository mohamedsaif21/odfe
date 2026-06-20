from odoo import api, fields, models, _
from odoo.exceptions import ValidationError


class OdfeCoupon(models.Model):
    _name = 'odfe.coupon'
    _description = 'Coupon'
    _order = 'name'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    name = fields.Char(string='Name', required=True, tracking=True)
    code = fields.Char(
        required=True,
        index=True,
        tracking=True,
        help='Coupon code entered at checkout (will be uppercased).',
    )
    type = fields.Selection(
        [('percentage', 'Percentage'), ('fixed_amount', 'Fixed Amount'), ('free_shipping', 'Free Shipping')],
        string='Discount Type',
        required=True,
        default='percentage',
    )
    value = fields.Float(
        string='Value',
        required=True,
        help='Discount value (percentage or fixed amount depending on type).',
    )
    currency_id = fields.Many2one(
        'res.currency',
        related='company_id.currency_id',
        readonly=True,
    )
    company_id = fields.Many2one(
        'res.company',
        default=lambda self: self.env.company,
    )
    minimum_order_amount = fields.Monetary(
        string='Minimum Order Amount',
        currency_field='currency_id',
        help='Minimum order subtotal required for this coupon to apply.',
    )
    maximum_discount = fields.Monetary(
        string='Maximum Discount',
        currency_field='currency_id',
        help='Cap on the discount amount (0 = no limit).',
    )
    usage_limit = fields.Integer(
        string='Usage Limit',
        default=0,
        help='Maximum number of times this coupon can be used. 0 = unlimited.',
    )
    used_count = fields.Integer(
        string='Used Count',
        compute='_compute_used_count',
    )
    customer_ids = fields.Many2many(
        'odfe.customer',
        string='Restricted to Customers',
        help='If set, only these customers may use this coupon. Leave empty to allow all.',
    )
    start_date = fields.Datetime(string='Start Date')
    end_date = fields.Datetime(string='End Date')
    active = fields.Boolean(default=True)
    description = fields.Text(string='Description')

    _sql_constraints = [
        ('code_unique', 'UNIQUE(code)', 'A coupon with this code already exists.'),
    ]

    @api.depends()
    def _compute_used_count(self):
        for record in self:
            record.used_count = self.env['odfe.order.discount'].search_count([
                ('coupon_id', '=', record.id),
            ])

    @api.constrains('code')
    def _check_code_uppercase(self):
        for r in self:
            if r.code and r.code != r.code.upper():
                raise ValidationError(_('Coupon code must be entirely uppercase.'))

    @api.constrains('start_date', 'end_date')
    def _check_dates(self):
        for r in self:
            if r.start_date and r.end_date and r.start_date >= r.end_date:
                raise ValidationError(_('Coupon start date must be before end date.'))

    def name_get(self):
        return [(r.id, f'[{r.code}] {r.name}') for r in self]

    def validate(self, customer_id=None, order_amount=0.0):
        self.ensure_one()
        if not self.active:
            return {'is_valid': False, 'error_message': _('This coupon is no longer active.')}
        now = fields.Datetime.now()
        if self.start_date and now < self.start_date:
            return {'is_valid': False, 'error_message': _('This coupon is not yet valid.')}
        if self.end_date and now > self.end_date:
            return {'is_valid': False, 'error_message': _('This coupon has expired.')}
        if self.usage_limit > 0 and self.used_count >= self.usage_limit:
            return {'is_valid': False, 'error_message': _('This coupon has reached its usage limit.')}
        if customer_id and self.customer_ids:
            customer = self.env['odfe.customer'].browse(customer_id)
            if customer not in self.customer_ids:
                return {'is_valid': False, 'error_message': _('This coupon is not valid for this customer.')}
        if self.minimum_order_amount > 0 and order_amount < self.minimum_order_amount:
            return {
                'is_valid': False,
                'error_message': _('Minimum order amount of %s required.') % self.minimum_order_amount,
            }
        return {'is_valid': True, 'error_message': ''}

    def apply(self, order_id):
        self.ensure_one()
        validation = self.validate()
        if not validation['is_valid']:
            return False
        order = self.env['odfe.pos.order'].browse(order_id)
        if not order.exists():
            return False
        discount_amount = 0.0
        if self.type == 'percentage':
            discount_amount = order.total * (self.value / 100.0)
        elif self.type == 'fixed_amount':
            discount_amount = self.value
        elif self.type == 'free_shipping':
            shipping_lines = order.line_ids.filtered(
                lambda l: l.product_id and l.product_id.product_tmpl_id.type == 'service'
            )
            discount_amount = sum(shipping_lines.mapped('price_subtotal'))
        if self.maximum_discount > 0 and discount_amount > self.maximum_discount:
            discount_amount = self.maximum_discount
        if self.type == 'free_shipping':
            discount_value = discount_amount
        else:
            discount_value = self.value
        vals = {
            'order_id': order.id,
            'name': self.name,
            'type': 'coupon',
            'discount_type': self.type if self.type != 'free_shipping' else 'fixed',
            'value': discount_value,
            'coupon_id': self.id,
        }
        self.env['odfe.order.discount'].create(vals)
        return True

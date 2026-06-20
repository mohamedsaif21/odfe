from odoo import api, fields, models


class OdpeProductTax(models.Model):
    _name = 'odfe.product.tax'
    _description = 'ODFE Product Tax'
    _inherit = ['odfe.base.mixin']
    _rec_name = 'name'
    _order = 'sequence, name'

    name = fields.Char(string='Tax Name', required=True, translate=True)
    amount = fields.Float(string='Amount', default=0.0, digits=(16, 4))
    percentage = fields.Float(string='Percentage (%)', default=0.0, digits=(16, 4))
    type = fields.Selection([
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed'),
    ], string='Type', required=True, default='percentage')
    included_in_price = fields.Boolean(string='Included in Price', default=False)
    active = fields.Boolean(string='Active', default=True)
    applicable_on = fields.Selection([
        ('food', 'Food'),
        ('beverage', 'Beverage'),
        ('all', 'All'),
    ], string='Applicable On', required=True, default='all')
    account_id = fields.Many2one('account.account', string='Tax Account',
        domain="[('deprecated', '=', False)]")
    sequence = fields.Integer(default=10)

    @api.constrains('percentage', 'type')
    def _check_percentage(self):
        for record in self:
            if record.type == 'percentage' and (record.percentage < 0 or record.percentage > 100):
                raise models.ValidationError('Percentage must be between 0 and 100.')

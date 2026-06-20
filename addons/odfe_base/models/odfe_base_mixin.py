from odoo import models, fields


class OdfeBaseMixin(models.AbstractModel):
    _name = 'odfe.base.mixin'
    _description = 'ODFE Base Mixin'

    active = fields.Boolean(default=True)
    company_id = fields.Many2one('res.company', string='Company', default=lambda self: self.env.company)
    currency_id = fields.Many2one('res.currency', related='company_id.currency_id', readonly=True)
    sequence = fields.Integer(default=10, help='Ordering sequence')

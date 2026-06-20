from odoo import models, fields, api, _
from odoo.exceptions import ValidationError


class OdfePayment(models.Model):
    _name = 'odfe.payment'
    _description = 'ODFE Payment'
    _rec_name = 'name'
    _inherit = ['odfe.base.mixin']
    _order = 'paid_at desc, id desc'

    name = fields.Char(string='Reference', required=True, default=lambda self: _('New'), copy=False)
    order_id = fields.Many2one('odfe.pos.order', string='Order', ondelete='cascade', index=True)
    session_id = fields.Many2one('odfe.pos.session', string='Session', index=True)
    method_id = fields.Many2one('odfe.payment.method', string='Payment Method', required=True, ondelete='restrict')
    amount = fields.Monetary(string='Amount', required=True, currency_field='currency_id')
    currency_id = fields.Many2one('res.currency', string='Currency', required=True,
                                  default=lambda self: self.env.company.currency_id)
    reference = fields.Char(string='External Reference', copy=False)
    state = fields.Selection([
        ('draft', 'Draft'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ], string='State', required=True, default='draft', tracking=True)
    paid_at = fields.Datetime(string='Paid At', default=fields.Datetime.now)
    account_id = fields.Many2one('account.account', string='Payment Account',
                                 domain=[('deprecated', '=', False)], ondelete='restrict')
    company_id = fields.Many2one('res.company', string='Company',
                                 default=lambda self: self.env.company)

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', _('New')) == _('New'):
                vals['name'] = self.env['ir.sequence'].next_by_code('odfe.payment') or _('New')
        return super().create(vals_list)

    def action_complete(self):
        self.write({'state': 'completed', 'paid_at': fields.Datetime.now()})
        return True

    def action_fail(self):
        self.write({'state': 'failed'})
        return True

    def action_refund(self):
        self.write({'state': 'refunded'})
        return True

    def action_draft(self):
        self.write({'state': 'draft', 'paid_at': False})
        return True

    @api.constrains('state', 'amount')
    def _check_amount(self):
        for rec in self:
            if rec.state == 'completed' and rec.amount <= 0:
                raise ValidationError(_('Payment amount must be positive.'))

    @api.onchange('method_id')
    def _onchange_method_id(self):
        if self.method_id and self.method_id.type:
            return {'domain': {}}

from odoo import models, fields, api
from odoo.tools import float_is_zero


class OdpePaymentCash(models.Model):
    _name = 'odfe.payment.cash'
    _description = 'ODFE Cash Payment'
    _inherit = 'odfe.payment'

    cash_received = fields.Monetary(string='Cash Received', currency_field='currency_id')
    change_given = fields.Monetary(string='Change Given', compute='_compute_change_given',
                                   currency_field='currency_id', store=True)
    opening_balance = fields.Float(string='Opening Balance', digits=(16, 2), default=0.0)
    closing_balance = fields.Float(string='Closing Balance', digits=(16, 2), default=0.0)

    @api.depends('cash_received', 'amount')
    def _compute_change_given(self):
        for rec in self:
            rec.change_given = max(0.0, (rec.cash_received or 0.0) - rec.amount)

    @api.onchange('cash_received')
    def _onchange_cash_received(self):
        if self.cash_received and self.amount:
            self.change_given = max(0.0, self.cash_received - self.amount)

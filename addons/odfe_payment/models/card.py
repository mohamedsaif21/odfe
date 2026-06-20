from odoo import models, fields, api, _
from odoo.exceptions import ValidationError


class OdfePaymentCard(models.Model):
    _name = 'odfe.payment.card'
    _description = 'ODFE Card Payment'
    _inherit = 'odfe.payment'

    card_type = fields.Selection([
        ('credit', 'Credit Card'),
        ('debit', 'Debit Card'),
    ], string='Card Type', required=True, default='debit')
    card_last_four = fields.Char(string='Last 4 Digits', size=4)
    cardholder_name = fields.Char(string='Cardholder Name')
    authorization_code = fields.Char(string='Authorization Code')
    terminal_id = fields.Char(string='Terminal ID')

    @api.constrains('card_last_four')
    def _check_card_last_four(self):
        for rec in self:
            if rec.card_last_four and (len(rec.card_last_four) != 4 or not rec.card_last_four.isdigit()):
                raise ValidationError(_('Card last four digits must be exactly 4 digits.'))

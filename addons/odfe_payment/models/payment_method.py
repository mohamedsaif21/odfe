from odoo import models, fields, api, _
from odoo.exceptions import ValidationError


class OdpePaymentMethod(models.Model):
    _name = 'odfe.payment.method'
    _description = 'ODFE Payment Method'
    _rec_name = 'name'
    _order = 'sequence, name'

    name = fields.Char(string='Payment Method', required=True, translate=True)
    code = fields.Char(string='Code', required=True, help='Unique code for the payment method')
    type = fields.Selection([
        ('cash', 'Cash'),
        ('card', 'Card'),
        ('upi', 'UPI'),
        ('qr', 'QR'),
        ('other', 'Other'),
    ], string='Type', required=True, default='other')
    active = fields.Boolean(string='Active', default=True)
    sequence = fields.Integer(string='Sequence', default=10)
    is_default = fields.Boolean(string='Default Method', default=False)
    image = fields.Binary(string='Image', attachment=True)

    _sql_constraints = [
        ('code_unique', 'UNIQUE(code)', 'The payment method code must be unique!'),
    ]

    @api.constrains('is_default')
    def _check_default(self):
        for record in self:
            if record.is_default:
                existing = self.search([('is_default', '=', True), ('id', '!=', record.id)])
                if existing:
                    raise ValidationError(_('Only one payment method can be set as default.'))

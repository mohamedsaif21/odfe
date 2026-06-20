import re

from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


class OdpeEmployee(models.Model):
    _name = 'odfe.employee'
    _description = 'ODFE Employee'
    _inherit = 'odfe.base.mixin'
    _rec_name = 'name'
    _order = 'sequence, name'

    name = fields.Char(string='Name', required=True)
    user_id = fields.Many2one('res.users', string='User', ondelete='set null')
    phone = fields.Char(string='Phone')
    email = fields.Char(string='Email')
    pin = fields.Char(
        string='PIN',
        size=6,
        help='4-6 digit PIN for POS authentication.',
    )
    role = fields.Selection(
        selection=[
            ('admin', 'Admin'),
            ('manager', 'Manager'),
            ('cashier', 'Cashier'),
            ('kitchen', 'Kitchen'),
            ('waiter', 'Waiter'),
        ],
        string='Role',
        default='cashier',
        required=True,
    )

    @api.constrains('pin')
    def _check_pin(self):
        for record in self:
            if record.pin and not re.match(r'^\d{4,6}$', record.pin):
                raise ValidationError(
                    _('Employee PIN must be a 4 to 6 digit number.')
                )

    @api.constrains('email')
    def _check_email(self):
        for record in self:
            if record.email and not re.match(r'^[^@]+@[^@]+\.[^@]+$', record.email):
                raise ValidationError(
                    _('Please enter a valid email address for employee %s.', record.name)
                )

    @api.constrains('user_id')
    def _check_user_id(self):
        for record in self:
            if record.user_id and record.user_id.employee_id and record.user_id.employee_id != record:
                raise ValidationError(
                    _('This user is already linked to another employee.')
                )

    def write(self, vals):
        if 'user_id' in vals and vals.get('user_id'):
            user = self.env['res.users'].browse(vals['user_id'])
            if user.employee_id and user.employee_id.id not in self.ids:
                raise ValidationError(
                    _('This user is already linked to another employee.')
                )
        return super().write(vals)

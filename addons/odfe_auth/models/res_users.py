import re

from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


class ResUsers(models.Model):
    _inherit = 'res.users'

    odfe_role = fields.Selection(
        selection=[
            ('admin', 'Admin'),
            ('manager', 'Manager'),
            ('cashier', 'Cashier'),
            ('kitchen', 'Kitchen'),
            ('waiter', 'Waiter'),
        ],
        string='ODFE Role',
        default='cashier',
        help='Restaurant-specific role for POS access control.',
    )
    employee_id = fields.Many2one(
        'odfe.employee',
        string='Linked Employee',
        help='Link this user to an ODFE employee record.',
    )
    pos_security_pin = fields.Char(
        string='POS Security PIN',
        size=6,
        help='4-6 digit PIN used for POS authentication.',
    )

    @api.constrains('pos_security_pin')
    def _check_pos_security_pin(self):
        for record in self:
            if record.pos_security_pin:
                if not re.match(r'^\d{4,6}$', record.pos_security_pin):
                    raise ValidationError(
                        _('POS Security PIN must be a 4 to 6 digit number.')
                    )

    @api.constrains('employee_id')
    def _check_employee_id(self):
        for record in self:
            if record.employee_id and record.employee_id.user_id and record.employee_id.user_id != record:
                raise ValidationError(
                    _('This employee is already linked to another user.')
                )

    def write(self, vals):
        if 'employee_id' in vals and vals.get('employee_id'):
            existing = self.env['odfe.employee'].search([
                ('user_id', '=', vals['employee_id']),
                ('id', 'in', self.employee_id.ids if self.employee_id else []),
            ])
            if existing and existing.id not in self.mapped('employee_id').ids:
                raise ValidationError(
                    _('This employee is already linked to another user.')
                )
        return super().write(vals)

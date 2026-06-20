from odoo import fields, models


class OdpeRole(models.Model):
    _name = 'odfe.role'
    _description = 'ODFE Role'
    _inherit = 'odfe.base.mixin'
    _rec_name = 'name'
    _order = 'sequence, name'

    name = fields.Char(string='Role Name', required=True, translate=True)
    code = fields.Char(
        string='Code',
        required=True,
        unique=True,
        help='Unique code identifier for the role.',
    )
    description = fields.Text(string='Description')
    permission_ids = fields.One2many(
        'odfe.role.permission',
        'role_id',
        string='Permissions',
    )

    _sql_constraints = [
        ('unique_code', 'UNIQUE(code)', 'The role code must be unique.'),
    ]


class OdpeRolePermission(models.Model):
    _name = 'odfe.role.permission'
    _description = 'ODFE Role Permission'
    _inherit = 'odfe.base.mixin'
    _order = 'sequence, id'

    role_id = fields.Many2one(
        'odfe.role',
        string='Role',
        required=True,
        ondelete='cascade',
    )
    model = fields.Char(
        string='Model',
        required=True,
        help='Technical name of the model (e.g. odfe.product).',
    )
    perm_read = fields.Boolean(string='Read', default=True)
    perm_write = fields.Boolean(string='Write', default=False)
    perm_create = fields.Boolean(string='Create', default=False)
    perm_unlink = fields.Boolean(string='Delete', default=False)

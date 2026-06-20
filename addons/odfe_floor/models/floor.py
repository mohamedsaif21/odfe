from odoo import api, fields, models


class OdfeFloor(models.Model):
    _name = 'odfe.floor'
    _description = 'Restaurant Floor'
    _order = 'sequence, name'

    name = fields.Char(string='Floor Name', required=True, translate=True)
    sequence = fields.Integer(string='Sequence', default=10)
    code = fields.Char(string='Floor Code', required=True, copy=False)
    color = fields.Integer(string='Color Index')
    image = fields.Binary(string='Image', attachment=True)
    active = fields.Boolean(string='Active', default=True)
    table_ids = fields.One2many('odfe.table', 'floor_id', string='Tables')

    _sql_constraints = [
        ('code_unique', 'UNIQUE(code)', 'Floor code must be unique!'),
    ]

    @api.depends('name', 'code')
    def _compute_display_name(self):
        for rec in self:
            rec.display_name = f'[{rec.code}] {rec.name}' if rec.code else rec.name

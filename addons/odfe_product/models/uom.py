from odoo import fields, models


class OdfeProductUom(models.Model):
    _name = 'odfe.product.uom'
    _description = 'ODFE Unit of Measure'
    _inherit = ['odfe.base.mixin']
    _rec_name = 'name'
    _order = 'sequence, name'

    uom_id = fields.Many2one('uom.uom', string='Source UoM',
        required=True, ondelete='cascade', index=True)
    name = fields.Char(related='uom_id.name', string='Name', readonly=True, store=True)
    category_id_rel = fields.Many2one(related='uom_id.category_id', string='UoM Category', readonly=True)
    uom_type = fields.Selection(related='uom_id.uom_type', string='Type', readonly=True)
    factor = fields.Float(related='uom_id.factor', string='Factor', readonly=True)
    rounding = fields.Float(related='uom_id.rounding', string='Rounding Precision', readonly=True)
    active = fields.Boolean(string='Active', default=True)
    sequence = fields.Integer(default=10)

    restaurant_specific = fields.Boolean(string='Restaurant Specific', default=False,
        help='If True, this UoM is specifically defined for restaurant use')
    serving_size = fields.Float(string='Serving Size', default=1.0,
        help='Default serving size in this UoM')
    category = fields.Selection([
        ('food', 'Food'),
        ('beverage', 'Beverage'),
        ('other', 'Other'),
    ], string='Category', default='other', help='Product category this UoM applies to')

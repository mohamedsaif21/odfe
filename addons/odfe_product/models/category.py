from odoo import api, fields, models


class OdfeProductCategory(models.Model):
    _name = 'odfe.product.category'
    _description = 'ODFE Product Category'
    _inherit = ['odfe.base.mixin']
    _rec_name = 'display_name'
    _order = 'sequence, name'
    _parent_store = True
    _parent_order = 'sequence, name'

    name = fields.Char(string='Name', required=True, translate=True)
    parent_id = fields.Many2one('odfe.product.category', string='Parent Category',
        index=True, ondelete='cascade')
    parent_path = fields.Char(index=True, compute='_compute_parent_path', store=True)
    child_id = fields.One2many('odfe.product.category', 'parent_id', string='Child Categories')
    display_name = fields.Char(string='Display Name', compute='_compute_display_name', store=True)
    sequence = fields.Integer(default=10)
    image = fields.Image(string='Image', max_width=1920, max_height=1920)
    pos_visible = fields.Boolean(string='Visible in POS', default=True)
    color = fields.Integer(string='Color', default=0, help='Color index for UI display')
    product_ids = fields.One2many('odfe.product', 'category_id', string='Products')

    @api.depends('name', 'parent_id.display_name')
    def _compute_display_name(self):
        for record in self:
            if record.parent_id:
                record.display_name = f'{record.parent_id.display_name} / {record.name}'
            else:
                record.display_name = record.name

    @api.depends('parent_id')
    def _compute_parent_path(self):
        for record in self:
            record.parent_path = record._compute_parent_path_strict()

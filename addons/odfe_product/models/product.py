from odoo import api, fields, models


class OdpeProduct(models.Model):
    _name = 'odfe.product'
    _description = 'ODFE Product'
    _inherit = ['odfe.base.mixin']
    _rec_name = 'display_name'
    _order = 'sequence, name'

    product_tmpl_id = fields.Many2one('product.template', string='Product Template',
        required=True, ondelete='cascade', index=True)
    name = fields.Char(related='product_tmpl_id.name', string='Name', readonly=True, store=True)
    display_name = fields.Char(related='product_tmpl_id.display_name', string='Display Name', readonly=True, store=True)
    default_code = fields.Char(related='product_tmpl_id.default_code', string='Internal Reference', readonly=True, store=True)
    barcode = fields.Char(related='product_tmpl_id.barcode', string='Barcode', readonly=True, store=True)
    list_price = fields.Float(related='product_tmpl_id.list_price', string='Price', readonly=True, store=True)
    image_128 = fields.Image(related='product_tmpl_id.image_128', string='Image', readonly=True)
    uom_id = fields.Many2one(related='product_tmpl_id.uom_id', string='Unit of Measure', readonly=True, store=True)
    tax_ids = fields.Many2many(related='product_tmpl_id.taxes_id', string='Taxes', readonly=True)
    available_in_pos = fields.Boolean(related='product_tmpl_id.available_in_pos', string='Available in POS', readonly=True, store=True)
    sequence = fields.Integer(default=10)

    pos_visible = fields.Boolean(string='Visible in POS', default=True)
    kds_visible = fields.Boolean(string='Visible on KDS', default=True)
    preparation_time = fields.Float(string='Preparation Time (min)', default=0.0, help='Average preparation time in minutes')
    modifiers_available = fields.Boolean(string='Has Modifiers', default=False)
    modifier_ids = fields.Many2many('odfe.product.modifier', string='Modifiers',
        relation='odfe_product_modifier_rel', column1='product_id', column2='modifier_id')
    category_id = fields.Many2one('odfe.product.category', string='ODFE Category',
        index=True, ondelete='restrict')

    is_food = fields.Boolean(string='Is Food', compute='_compute_product_type', store=True)
    is_beverage = fields.Boolean(string='Is Beverage', compute='_compute_product_type', store=True)
    tax_type = fields.Selection([
        ('food', 'Food'),
        ('beverage', 'Beverage'),
        ('all', 'All'),
    ], string='Tax Type', compute='_compute_tax_type', store=True)

    @api.depends('category_id')
    def _compute_product_type(self):
        for record in self:
            record.is_food = False
            record.is_beverage = False
            if record.category_id:
                cat = record.category_id
                cat_name = cat.name.lower()
                beverage_keywords = ['beverage', 'drink', 'juice', 'soda', 'coffee', 'tea', 'water', 'cocktail', 'beer', 'wine', 'liquor']
                food_keywords = ['starter', 'appetizer', 'main', 'main course', 'entree', 'dessert', 'side', 'salad', 'soup', 'bread']
                if any(kw in cat_name for kw in beverage_keywords):
                    record.is_beverage = True
                elif any(kw in cat_name for kw in food_keywords):
                    record.is_food = True

    @api.depends('is_food', 'is_beverage')
    def _compute_tax_type(self):
        for record in self:
            if record.is_beverage:
                record.tax_type = 'beverage'
            elif record.is_food:
                record.tax_type = 'food'
            else:
                record.tax_type = 'all'

import json

from odoo import api, fields, models, _


class OdpeSelfOrderMenu(models.Model):
    _name = 'odfe.self.order.menu'
    _description = 'Self Order Menu'
    _rec_name = 'name'
    _order = 'sequence, name'

    name = fields.Char(string='Menu Name', required=True, translate=True)
    active = fields.Boolean(string='Active', default=True)
    product_ids = fields.Many2many('odfe.product', string='Products',
        relation='odfe_self_menu_product_rel', column1='menu_id', column2='product_id')
    category_ids = fields.Many2many('odfe.product.category', string='Categories',
        relation='odfe_self_menu_category_rel', column1='menu_id', column2='category_id')
    restaurant_id = fields.Many2one('res.partner', string='Restaurant',
        domain="[('is_company', '=', True)]",
        help='If set, this menu is scoped to a specific restaurant.')
    is_active = fields.Boolean(string='Active for Self Order', default=True)
    sequence = fields.Integer(string='Sequence', default=10)
    description = fields.Text(string='Description', translate=True)
    image = fields.Binary(string='Menu Image', attachment=True)

    def get_menu_data(self):
        self.ensure_one()
        domain = [('available_in_pos', '=', True), ('pos_visible', '=', True)]
        if self.product_ids:
            domain.append(('id', 'in', self.product_ids.ids))
        elif self.category_ids:
            domain.append(('category_id', 'in', self.category_ids.ids))
        products = self.env['odfe.product'].search(domain, order='sequence, name')
        categories = self.env['odfe.product.category'].search([
            ('pos_visible', '=', True),
        ], order='sequence, name')
        if self.category_ids:
            categories = categories & self.category_ids
        category_data = []
        for cat in categories:
            cat_products = products.filtered(lambda p: p.category_id and p.category_id.id == cat.id)
            if not cat_products:
                continue
            category_data.append({
                'id': cat.id,
                'name': cat.name,
                'display_name': cat.display_name,
                'image': f'/web/image/odfe.product.category/{cat.id}/image' if cat.image else False,
                'products': [{
                    'id': p.id,
                    'name': p.name,
                    'display_name': p.display_name,
                    'price': p.list_price,
                    'image': f'/web/image/odfe.product/{p.id}/image_128' if p.image_128 else False,
                    'description': p.product_tmpl_id.description_sale or '',
                    'category_id': p.category_id.id if p.category_id else False,
                    'modifiers_available': p.modifiers_available,
                } for p in cat_products],
            })
        return {
            'menu_id': self.id,
            'menu_name': self.name,
            'categories': category_data,
            'currency': self.env.company.currency_id.symbol if self.env.company.currency_id else '$',
        }

    def action_preview_menu(self):
        self.ensure_one()
        data = self.get_menu_data()
        return {
            'type': 'ir.actions.act_window',
            'res_model': 'odfe.self.order.menu.preview',
            'view_mode': 'form',
            'target': 'new',
            'context': {'default_menu_data': json.dumps(data)},
        }

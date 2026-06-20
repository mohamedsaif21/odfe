from odoo import api, fields, models, _
from collections import defaultdict


class OdfeReportProducts(models.TransientModel):
    _name = 'odfe.report.products'
    _description = 'Products Report'

    date_from = fields.Date(string='From', required=True, default=fields.Date.today)
    date_to = fields.Date(string='To', required=True, default=fields.Date.today)
    category_id = fields.Many2one('odfe.product.category', string='Category')
    limit = fields.Integer(string='Limit', default=20)

    @api.model
    def get_top_products(self, date_from=None, date_to=None, limit=20):
        domain = [('order_id.state', 'in', ('paid', 'refunded'))]
        if date_from:
            domain.append(('order_id.ordered_at', '>=', date_from))
        if date_to:
            domain.append(('order_id.ordered_at', '<=', date_to + ' 23:59:59'))

        lines = self.env['odfe.pos.order.line'].search(domain)
        non_modifiers = lines.filtered(lambda l: not l.is_modifier)

        product_data = defaultdict(lambda: {
            'quantity': 0.0, 'revenue': 0.0, 'orders': set(), 'discounts': 0.0,
        })

        for line in non_modifiers:
            key = line.product_id.id
            product_data[key]['quantity'] += line.quantity
            product_data[key]['revenue'] += line.subtotal
            product_data[key]['orders'].add(line.order_id.id)
            product_data[key]['discounts'] += line.discount_amount

        sorted_products = sorted(
            product_data.items(), key=lambda x: -x[1]['revenue']
        )[:limit]

        result = []
        for rank, (prod_id, data) in enumerate(sorted_products, 1):
            product = self.env['odfe.product'].browse(prod_id)
            result.append({
                'rank': rank,
                'product_id': prod_id,
                'product_name': product.name,
                'product_code': product.default_code or '',
                'category': product.category_id.name if product.category_id else '',
                'quantity': round(data['quantity'], 2),
                'revenue': round(data['revenue'], 2),
                'order_count': len(data['orders']),
                'discounts': round(data['discounts'], 2),
                'avg_price': round(data['revenue'] / data['quantity'], 2) if data['quantity'] else 0,
            })

        return result

    @api.model
    def get_category_breakdown(self, date_from=None, date_to=None):
        domain = [('order_id.state', 'in', ('paid', 'refunded'))]
        if date_from:
            domain.append(('order_id.ordered_at', '>=', date_from))
        if date_to:
            domain.append(('order_id.ordered_at', '<=', date_to + ' 23:59:59'))

        lines = self.env['odfe.pos.order.line'].search(domain)
        non_modifiers = lines.filtered(lambda l: not l.is_modifier)

        cat_data = defaultdict(lambda: {
            'revenue': 0.0, 'orders': set(), 'quantity': 0.0, 'discounts': 0.0,
        })

        for line in non_modifiers:
            cat = line.product_id.category_id
            cat_name = cat.name if cat else 'Uncategorized'
            cat_data[cat_name]['revenue'] += line.subtotal
            cat_data[cat_name]['orders'].add(line.order_id.id)
            cat_data[cat_name]['quantity'] += line.quantity
            cat_data[cat_name]['discounts'] += line.discount_amount

        total_revenue = sum(v['revenue'] for v in cat_data.values())
        return [
            {
                'category': cat,
                'revenue': round(v['revenue'], 2),
                'orders': len(v['orders']),
                'quantity': round(v['quantity'], 2),
                'discounts': round(v['discounts'], 2),
                'percentage': round((v['revenue'] / total_revenue * 100), 2) if total_revenue else 0,
            }
            for cat, v in sorted(cat_data.items(), key=lambda x: -x[1]['revenue'])
        ]

    @api.model
    def get_product_movement(self, date_from=None, date_to=None, product_id=None):
        domain = [('order_id.state', 'in', ('paid', 'refunded'))]
        if date_from:
            domain.append(('order_id.ordered_at', '>=', date_from))
        if date_to:
            domain.append(('order_id.ordered_at', '<=', date_to + ' 23:59:59'))
        if product_id:
            domain.append(('product_id', '=', product_id))

        lines = self.env['odfe.pos.order.line'].search(domain, order='order_id.ordered_at asc')
        non_modifiers = lines.filtered(lambda l: not l.is_modifier)

        movement = defaultdict(lambda: {'quantity': 0.0, 'revenue': 0.0, 'orders': set()})
        for line in non_modifiers:
            if line.order_id.ordered_at:
                day = fields.Datetime.to_string(line.order_id.ordered_at)[:10]
                movement[day]['quantity'] += line.quantity
                movement[day]['revenue'] += line.subtotal
                movement[day]['orders'].add(line.order_id.id)

        if product_id:
            product = self.env['odfe.product'].browse(product_id)
            product_name = product.name
        else:
            product_name = 'All Products'

        return {
            'product_name': product_name,
            'product_id': product_id,
            'movement': [
                {
                    'date': day,
                    'quantity': round(v['quantity'], 2),
                    'revenue': round(v['revenue'], 2),
                    'orders': len(v['orders']),
                    'avg_order_value': round(v['revenue'] / len(v['orders']), 2) if v['orders'] else 0,
                }
                for day, v in sorted(movement.items())
            ],
        }

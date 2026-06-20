from odoo import api, fields, models, _
from collections import defaultdict


class OdfeReportOrders(models.TransientModel):
    _name = 'odfe.report.orders'
    _description = 'Orders Report'

    date_from = fields.Date(string='From', required=True, default=fields.Date.today)
    date_to = fields.Date(string='To', required=True, default=fields.Date.today)

    @api.model
    def get_order_report(self, date_from=None, date_to=None):
        domain = []
        if date_from:
            domain.append(('ordered_at', '>=', date_from))
        if date_to:
            domain.append(('ordered_at', '<=', date_to + ' 23:59:59'))
        orders = self.env['odfe.pos.order'].search(domain, order='ordered_at desc')

        return [
            {
                'id': o.id,
                'name': o.name,
                'state': o.state,
                'table': o.table_id.name if o.table_id else 'Takeaway',
                'customer': o.customer_id.name if o.customer_id else 'Guest',
                'employee': o.employee_id.name if o.employee_id else '',
                'subtotal': o.subtotal,
                'tax_amount': o.tax_amount,
                'discount_total': o.discount_total,
                'total': o.total,
                'total_paid': o.total_paid,
                'ordered_at': o.ordered_at,
                'paid_at': o.paid_at,
                'line_count': len(o.line_ids),
                'payment_methods': ', '.join(o.payment_ids.mapped('method_id.name')),
                'note': o.note,
            }
            for o in orders
        ]

    @api.model
    def get_cancelled_orders(self, date_from=None, date_to=None):
        domain = [('state', '=', 'cancelled')]
        if date_from:
            domain.append(('ordered_at', '>=', date_from))
        if date_to:
            domain.append(('ordered_at', '<=', date_to + ' 23:59:59'))
        orders = self.env['odfe.pos.order'].search(domain, order='ordered_at desc')

        return {
            'total_cancelled': len(orders),
            'orders': [
                {
                    'id': o.id,
                    'name': o.name,
                    'table': o.table_id.name if o.table_id else 'Takeaway',
                    'employee': o.employee_id.name if o.employee_id else '',
                    'ordered_at': o.ordered_at,
                    'reason': o.note or '',
                    'subtotal': o.subtotal,
                    'discount_total': o.discount_total,
                }
                for o in orders
            ],
        }

    @api.model
    def get_peak_hours(self, date_from=None, date_to=None):
        domain = [('state', '=', 'paid')]
        if date_from:
            domain.append(('ordered_at', '>=', date_from))
        if date_to:
            domain.append(('ordered_at', '<=', date_to + ' 23:59:59'))
        orders = self.env['odfe.pos.order'].search(domain, order='ordered_at asc')

        hourly = defaultdict(lambda: {'orders': 0, 'revenue': 0.0})
        for o in orders:
            if o.ordered_at:
                hour = o.ordered_at.hour
                hourly[hour]['orders'] += 1
                hourly[hour]['revenue'] += o.total

        total_orders = sum(v['orders'] for v in hourly.values())
        peak_hour = max(hourly.items(), key=lambda x: x[1]['orders'])[0] if hourly else 0

        return {
            'peak_hour': peak_hour,
            'peak_label': f'{peak_hour:02d}:00 - {peak_hour + 1:02d}:00',
            'total_orders': total_orders,
            'hourly_data': [
                {
                    'hour': f'{h:02d}:00',
                    'orders': v['orders'],
                    'revenue': round(v['revenue'], 2),
                    'percentage': round((v['orders'] / total_orders * 100), 2) if total_orders else 0,
                }
                for h, v in sorted(hourly.items())
            ],
        }

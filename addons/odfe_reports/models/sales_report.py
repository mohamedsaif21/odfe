from odoo import api, fields, models, _
from dateutil.relativedelta import relativedelta
from collections import defaultdict


class OdpeReportSales(models.TransientModel):
    _name = 'odfe.report.sales'
    _description = 'Sales Report'

    date_from = fields.Date(string='From', required=True, default=fields.Date.today)
    date_to = fields.Date(string='To', required=True, default=fields.Date.today)
    period = fields.Selection([
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    ], string='Period', default='daily')
    category_id = fields.Many2one('odfe.product.category', string='Category')
    employee_id = fields.Many2one('odfe.employee', string='Employee')

    @api.model
    def get_sales_report(self, date_from=None, date_to=None, period=None, category_id=None, employee_id=None):
        domain = [('state', 'in', ('paid', 'refunded'))]
        if date_from:
            domain.append(('ordered_at', '>=', date_from))
        if date_to:
            domain.append(('ordered_at', '<=', date_to + ' 23:59:59'))
        if employee_id:
            domain.append(('employee_id', '=', employee_id))

        orders = self.env['odfe.pos.order'].search(domain, order='ordered_at asc')
        period = period or 'daily'

        if not orders:
            return {'total_revenue': 0, 'total_orders': 0, 'total_discounts': 0, 'total_taxes': 0, 'breakdown': []}

        aggregated = defaultdict(lambda: {
            'revenue': 0.0, 'orders': 0, 'discounts': 0.0, 'taxes': 0.0, 'cost': 0.0, 'count': 0,
        })

        for order in orders:
            if category_id:
                relevant_lines = order.line_ids.filtered(
                    lambda l: l.product_id.category_id.id == category_id and not l.is_modifier
                )
                if not relevant_lines:
                    continue
                revenue = sum(relevant_lines.mapped('subtotal'))
                taxes = sum(relevant_lines.mapped('tax_amount'))
                discounts = sum(relevant_lines.mapped('discount_amount'))
            else:
                revenue = order.total
                taxes = order.tax_amount
                discounts = order.discount_total

            key = self._get_period_key(order.ordered_at, period)
            entry = aggregated[key]
            entry['revenue'] += revenue
            entry['orders'] += 1
            entry['discounts'] += discounts
            entry['taxes'] += taxes
            entry['count'] += 1

        return {
            'total_revenue': sum(e['revenue'] for e in aggregated.values()),
            'total_orders': sum(e['orders'] for e in aggregated.values()),
            'total_discounts': sum(e['discounts'] for e in aggregated.values()),
            'total_taxes': sum(e['taxes'] for e in aggregated.values()),
            'breakdown': [
                {
                    'label': label,
                    'revenue': round(data['revenue'], 2),
                    'orders': data['orders'],
                    'discounts': round(data['discounts'], 2),
                    'taxes': round(data['taxes'], 2),
                }
                for label, data in sorted(aggregated.items())
            ],
        }

    @api.model
    def get_summary(self, date_from=None, date_to=None):
        domain = [('state', 'in', ('paid', 'refunded'))]
        if date_from:
            domain.append(('ordered_at', '>=', date_from))
        if date_to:
            domain.append(('ordered_at', '<=', date_to + ' 23:59:59'))
        orders = self.env['odfe.pos.order'].search(domain)

        paid = orders.filtered(lambda o: o.state == 'paid')
        cancelled = self.env['odfe.pos.order'].search_count(
            [('state', '=', 'cancelled')] + (domain[1:] if len(domain) > 1 else [])
        )

        return {
            'total_revenue': round(sum(paid.mapped('total')), 2),
            'total_orders': len(paid),
            'total_discounts': round(sum(paid.mapped('discount_total')), 2),
            'total_taxes': round(sum(paid.mapped('tax_amount')), 2),
            'average_order_value': round(sum(paid.mapped('total')) / len(paid), 2) if paid else 0.0,
            'cancelled_orders': cancelled,
        }

    @api.model
    def get_daily_breakdown(self, date_from=None, date_to=None):
        domain = [('state', '=', 'paid')]
        if date_from:
            domain.append(('ordered_at', '>=', date_from))
        if date_to:
            domain.append(('ordered_at', '<=', date_to + ' 23:59:59'))
        orders = self.env['odfe.pos.order'].search(domain, order='ordered_at asc')

        daily = defaultdict(lambda: {'revenue': 0.0, 'orders': 0, 'discounts': 0.0, 'taxes': 0.0})
        for order in orders:
            day = fields.Datetime.to_string(order.ordered_at)[:10]
            daily[day]['revenue'] += order.total
            daily[day]['orders'] += 1
            daily[day]['discounts'] += order.discount_total
            daily[day]['taxes'] += order.tax_amount

        return [
            {
                'date': day,
                'revenue': round(v['revenue'], 2),
                'orders': v['orders'],
                'discounts': round(v['discounts'], 2),
                'taxes': round(v['taxes'], 2),
            }
            for day, v in sorted(daily.items())
        ]

    @api.model
    def get_payment_breakdown(self, date_from=None, date_to=None):
        domain = [('state', '=', 'completed')]
        if date_from:
            domain.append(('paid_at', '>=', date_from))
        if date_to:
            domain.append(('paid_at', '<=', date_to + ' 23:59:59'))
        payments = self.env['odfe.payment'].search(domain)

        breakdown = defaultdict(lambda: {'amount': 0.0, 'count': 0, 'transactions': []})
        for p in payments:
            method = p.method_id.name or 'Unknown'
            breakdown[method]['amount'] += p.amount
            breakdown[method]['count'] += 1
            breakdown[method]['transactions'].append({
                'id': p.id,
                'order': p.order_id.name if p.order_id else '',
                'amount': p.amount,
                'paid_at': p.paid_at,
            })

        total = sum(v['amount'] for v in breakdown.values())
        return [
            {
                'method': method,
                'amount': round(v['amount'], 2),
                'count': v['count'],
                'percentage': round((v['amount'] / total * 100), 2) if total else 0,
                'transactions': v['transactions'],
            }
            for method, v in sorted(breakdown.items(), key=lambda x: -x[1]['amount'])
        ]

    def _get_period_key(self, dt, period):
        if not dt:
            return 'Unknown'
        if period == 'daily':
            return fields.Datetime.to_string(dt)[:10]
        elif period == 'weekly':
            iso = dt.isocalendar()
            return f"{iso[0]}-W{iso[1]:02d}"
        elif period == 'monthly':
            return fields.Datetime.to_string(dt)[:7]
        elif period == 'yearly':
            return str(dt.year)
        return fields.Datetime.to_string(dt)[:10]

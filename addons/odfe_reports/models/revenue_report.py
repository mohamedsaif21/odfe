from odoo import api, fields, models, _
from collections import defaultdict
from dateutil.relativedelta import relativedelta


class OdpeReportRevenue(models.TransientModel):
    _name = 'odfe.report.revenue'
    _description = 'Revenue Report'

    date_from = fields.Date(string='From', required=True, default=fields.Date.today)
    date_to = fields.Date(string='To', required=True, default=fields.Date.today)

    @api.model
    def get_revenue_report(self, date_from=None, date_to=None, period='daily'):
        domain = [('state', '=', 'paid')]
        if date_from:
            domain.append(('ordered_at', '>=', date_from))
        if date_to:
            domain.append(('ordered_at', '<=', date_to + ' 23:59:59'))

        orders = self.env['odfe.pos.order'].search(domain, order='ordered_at asc')
        if not orders:
            return {'period': period, 'data': [], 'total': 0, 'growth': 0.0}

        grouped = defaultdict(lambda: {'revenue': 0.0, 'orders': 0, 'discounts': 0.0})
        for o in orders:
            key = self._get_key(o.ordered_at, period)
            grouped[key]['revenue'] += o.total
            grouped[key]['orders'] += 1
            grouped[key]['discounts'] += o.discount_total

        sorted_keys = sorted(grouped.keys())
        data = []
        prev_revenue = None
        for key in sorted_keys:
            entry = grouped[key]
            growth = round(
                ((entry['revenue'] - prev_revenue) / prev_revenue * 100), 2
            ) if prev_revenue and prev_revenue else 0.0
            data.append({
                'label': key,
                'revenue': round(entry['revenue'], 2),
                'orders': entry['orders'],
                'discounts': round(entry['discounts'], 2),
                'growth': growth,
            })
            prev_revenue = entry['revenue']

        total = sum(e['revenue'] for e in data)
        overall_growth = round(
            ((data[-1]['revenue'] - data[0]['revenue']) / data[0]['revenue'] * 100), 2
        ) if len(data) >= 2 and data[0]['revenue'] else 0.0

        return {'period': period, 'data': data, 'total': round(total, 2), 'growth': overall_growth}

    @api.model
    def get_tax_report(self, date_from=None, date_to=None):
        domain = [('state', '=', 'paid')]
        if date_from:
            domain.append(('ordered_at', '>=', date_from))
        if date_to:
            domain.append(('ordered_at', '<=', date_to + ' 23:59:59'))
        orders = self.env['odfe.pos.order'].search(domain)

        total_revenue = sum(orders.mapped('total'))
        total_tax = sum(orders.mapped('tax_amount'))
        tax_rate = round((total_tax / total_revenue * 100), 2) if total_revenue else 0

        return {
            'total_revenue': round(total_revenue, 2),
            'total_tax': round(total_tax, 2),
            'effective_tax_rate': tax_rate,
            'taxable_base': round(total_revenue - total_tax, 2),
        }

    @api.model
    def get_profit_analysis(self, date_from=None, date_to=None):
        domain = [('state', '=', 'paid')]
        if date_from:
            domain.append(('ordered_at', '>=', date_from))
        if date_to:
            domain.append(('ordered_at', '<=', date_to + ' 23:59:59'))
        orders = self.env['odfe.pos.order'].search(domain)

        total_revenue = sum(orders.mapped('total'))
        total_discounts = sum(orders.mapped('discount_total'))
        total_taxes = sum(orders.mapped('tax_amount'))

        line_domain = [('order_id', 'in', orders.ids)]
        lines = self.env['odfe.pos.order.line'].search(line_domain)

        estimated_cost = 0.0
        for line in lines:
            if line.product_id.product_tmpl_id and line.product_id.product_tmpl_id.standard_price:
                estimated_cost += line.quantity * line.product_id.product_tmpl_id.standard_price

        gross_revenue = total_revenue + total_discounts
        net_revenue = total_revenue
        gross_profit = gross_revenue - estimated_cost
        net_profit = net_revenue - estimated_cost
        margin = round((gross_profit / gross_revenue * 100), 2) if gross_revenue else 0

        return {
            'gross_revenue': round(gross_revenue, 2),
            'net_revenue': round(net_revenue, 2),
            'total_discounts': round(total_discounts, 2),
            'total_taxes': round(total_taxes, 2),
            'estimated_cost': round(estimated_cost, 2),
            'gross_profit': round(gross_profit, 2),
            'net_profit': round(net_profit, 2),
            'profit_margin': margin,
        }

    def _get_key(self, dt, period):
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

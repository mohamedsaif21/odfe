from odoo import api, fields, models, _
from collections import defaultdict


class OdpeReportEmployees(models.TransientModel):
    _name = 'odfe.report.employees'
    _description = 'Employee Performance Report'

    date_from = fields.Date(string='From', required=True, default=fields.Date.today)
    date_to = fields.Date(string='To', required=True, default=fields.Date.today)
    employee_id = fields.Many2one('odfe.employee', string='Employee')

    @api.model
    def get_employee_performance(self, date_from=None, date_to=None):
        domain = [('state', '=', 'paid')]
        if date_from:
            domain.append(('ordered_at', '>=', date_from))
        if date_to:
            domain.append(('ordered_at', '<=', date_to + ' 23:59:59'))

        orders = self.env['odfe.pos.order'].search(domain)

        emp_data = defaultdict(lambda: {
            'orders': 0, 'revenue': 0.0, 'discounts': 0.0, 'taxes': 0.0,
            'items_sold': 0.0, 'order_ids': [],
        })

        for o in orders:
            emp = o.employee_id
            if not emp:
                continue
            key = emp.id
            emp_data[key]['orders'] += 1
            emp_data[key]['revenue'] += o.total
            emp_data[key]['discounts'] += o.discount_total
            emp_data[key]['taxes'] += o.tax_amount
            emp_data[key]['items_sold'] += sum(o.line_ids.filtered(lambda l: not l.is_modifier).mapped('quantity'))
            emp_data[key]['order_ids'].append(o.id)

        total_revenue = sum(v['revenue'] for v in emp_data.values())
        return [
            {
                'employee_id': eid,
                'employee_name': self.env['odfe.employee'].browse(eid).name,
                'employee_role': self.env['odfe.employee'].browse(eid).role,
                'orders': v['orders'],
                'revenue': round(v['revenue'], 2),
                'discounts': round(v['discounts'], 2),
                'taxes': round(v['taxes'], 2),
                'items_sold': round(v['items_sold'], 2),
                'avg_order_value': round(v['revenue'] / v['orders'], 2) if v['orders'] else 0,
                'revenue_percentage': round((v['revenue'] / total_revenue * 100), 2) if total_revenue else 0,
                'order_ids': v['order_ids'],
            }
            for eid, v in sorted(emp_data.items(), key=lambda x: -x[1]['revenue'])
        ]

    @api.model
    def get_hourly_analysis(self, employee_id, date_from=None, date_to=None):
        domain = [('state', '=', 'paid')]
        if employee_id:
            domain.append(('employee_id', '=', employee_id))
        if date_from:
            domain.append(('ordered_at', '>=', date_from))
        if date_to:
            domain.append(('ordered_at', '<=', date_to + ' 23:59:59'))

        orders = self.env['odfe.pos.order'].search(domain, order='ordered_at asc')

        hourly = defaultdict(lambda: {'orders': 0, 'revenue': 0.0, 'items': 0.0})
        for o in orders:
            if o.ordered_at:
                hour = o.ordered_at.hour
                hourly[hour]['orders'] += 1
                hourly[hour]['revenue'] += o.total
                hourly[hour]['items'] += sum(o.line_ids.filtered(lambda l: not l.is_modifier).mapped('quantity'))

        emp_name = self.env['odfe.employee'].browse(employee_id).name if employee_id else 'All Employees'
        return {
            'employee_name': emp_name,
            'employee_id': employee_id,
            'hourly_data': [
                {
                    'hour': f'{h:02d}:00',
                    'orders': v['orders'],
                    'revenue': round(v['revenue'], 2),
                    'items': round(v['items'], 2),
                    'avg_order': round(v['revenue'] / v['orders'], 2) if v['orders'] else 0,
                }
                for h, v in sorted(hourly.items())
            ],
        }

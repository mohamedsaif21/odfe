from odoo import api, fields, models, _
from collections import defaultdict


class OdfeReportSessions(models.TransientModel):
    _name = 'odfe.report.sessions'
    _description = 'Session Report'

    session_id = fields.Many2one('odfe.pos.session', string='Session')
    date_from = fields.Date(string='From', default=fields.Date.today)
    date_to = fields.Date(string='To', default=fields.Date.today)

    @api.model
    def get_session_report(self, session_id=None, date_from=None, date_to=None):
        domain = []
        if session_id:
            domain.append(('id', '=', session_id))
        if date_from:
            domain.append(('opened_at', '>=', date_from))
        if date_to:
            domain.append(('opened_at', '<=', date_to + ' 23:59:59'))

        sessions = self.env['odfe.pos.session'].search(domain, order='opened_at desc')

        result = []
        for session in sessions:
            orders = session.order_ids.filtered(lambda o: o.state == 'paid')
            payments = self.env['odfe.payment'].search([('session_id', '=', session.id), ('state', '=', 'completed')])

            payment_breakdown = defaultdict(float)
            for p in payments:
                payment_breakdown[p.method_id.name] += p.amount

            result.append({
                'id': session.id,
                'name': session.name,
                'user': session.user_id.name,
                'state': session.state,
                'opened_at': session.opened_at,
                'closed_at': session.closed_at,
                'start_cash': session.start_cash,
                'end_cash': session.end_cash,
                'total_sales': session.total_sales,
                'total_orders': session.total_orders,
                'duration': self._compute_duration(session.opened_at, session.closed_at),
                'payment_breakdown': [
                    {'method': m, 'amount': round(a, 2)}
                    for m, a in payment_breakdown.items()
                ],
                'order_ids': orders.ids,
                'avg_order_value': round(session.total_sales / session.total_orders, 2) if session.total_orders else 0,
                'notes': session.notes,
            })

        return result

    @api.model
    def get_cash_management(self, date_from=None, date_to=None):
        domain = [('state', '=', 'closed')]
        if date_from:
            domain.append(('closed_at', '>=', date_from))
        if date_to:
            domain.append(('closed_at', '<=', date_to + ' 23:59:59'))

        sessions = self.env['odfe.pos.session'].search(domain, order='closed_at desc')

        total_start_cash = 0.0
        total_end_cash = 0.0
        total_sales = 0.0
        total_orders = 0
        cash_payments = 0.0
        cash_refunds = 0.0
        discrepancies = []

        for session in sessions:
            s = session
            total_start_cash += s.start_cash or 0
            total_end_cash += s.end_cash or 0
            total_sales += s.total_sales
            total_orders += s.total_orders

            cash_payments += sum(
                self.env['odfe.payment'].search([
                    ('session_id', '=', s.id),
                    ('method_id.type', '=', 'cash'),
                    ('state', '=', 'completed'),
                ]).mapped('amount')
            )

            cash_refunds += sum(
                self.env['odfe.payment'].search([
                    ('session_id', '=', s.id),
                    ('method_id.type', '=', 'cash'),
                    ('state', '=', 'refunded'),
                ]).mapped('amount')
            )

            if s.end_cash and s.start_cash is not None:
                expected = (s.start_cash or 0) + cash_payments
                actual = s.end_cash or 0
                diff = round(actual - expected, 2)
                if abs(diff) > 0.01:
                    discrepancies.append({
                        'session_name': s.name,
                        'opened_at': s.opened_at,
                        'start_cash': s.start_cash,
                        'expected': round(expected, 2),
                        'actual': actual,
                        'difference': diff,
                    })

        net_cash = cash_payments - cash_refunds
        return {
            'total_sessions': len(sessions),
            'total_start_cash': round(total_start_cash, 2),
            'total_end_cash': round(total_end_cash, 2),
            'total_sales': round(total_sales, 2),
            'total_orders': total_orders,
            'cash_payments': round(cash_payments, 2),
            'cash_refunds': round(cash_refunds, 2),
            'net_cash': round(net_cash, 2),
            'discrepancies': discrepancies,
            'discrepancy_count': len(discrepancies),
        }

    def _compute_duration(self, opened_at, closed_at):
        if not opened_at or not closed_at:
            return ''
        delta = closed_at - opened_at
        hours, remainder = divmod(delta.total_seconds(), 3600)
        minutes = remainder // 60
        return f'{int(hours)}h {int(minutes)}m'

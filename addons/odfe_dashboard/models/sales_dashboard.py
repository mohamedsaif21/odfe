from odoo import api, fields, models, _
from datetime import timedelta
from dateutil.relativedelta import relativedelta


class OdfeDashboardConfig(models.TransientModel):
    _name = "odfe.dashboard.config"
    _description = "Dashboard Configuration"

    name = fields.Char(string="Name", default=lambda self: _("Dashboard Config"))
    date_from = fields.Datetime(string="From")
    date_to = fields.Datetime(string="To", default=fields.Datetime.now)
    period = fields.Selection([
        ("day", "Day"),
        ("week", "Week"),
        ("month", "Month"),
        ("year", "Year"),
    ], string="Period", default="month", required=True)
    show_trend = fields.Boolean(string="Show Trend", default=True)
    compare_period = fields.Boolean(string="Compare with Previous Period", default=True)

    def action_load_dashboard(self):
        self.ensure_one()
        data = self.env["odfe.dashboard.sales"].get_dashboard_data(
            self.date_from, self.date_to, self.period
        )
        return {
            "type": "ir.actions.act_window",
            "name": _("Dashboard"),
            "res_model": "odfe.dashboard.sales",
            "view_mode": "form",
            "target": "main",
            "context": dict(data),
        }


class OdfeDashboardSales(models.Model):
    _name = "odfe.dashboard.sales"
    _description = "Sales Dashboard Data"
    _auto = False

    total_revenue = fields.Monetary(string="Total Revenue")
    total_orders = fields.Integer(string="Total Orders")
    avg_order_value = fields.Monetary(string="Average Order Value")
    total_customers = fields.Integer(string="Total Customers")
    currency_id = fields.Many2one("res.currency", string="Currency")

    @api.model
    def get_dashboard_data(self, date_from=None, date_to=None, period="month"):
        if not date_from:
            if period == "day":
                date_from = fields.Datetime.now().replace(hour=0, minute=0, second=0)
            elif period == "week":
                date_from = fields.Datetime.now() - timedelta(days=7)
            elif period == "year":
                date_from = fields.Datetime.now() - relativedelta(years=1)
            else:
                date_from = fields.Datetime.now() - relativedelta(months=1)
        if not date_to:
            date_to = fields.Datetime.now()

        domain = [
            ("state", "=", "paid"),
            ("paid_at", ">=", date_from),
            ("paid_at", "<=", date_to),
        ]

        Order = self.env["odfe.pos.order"]
        OrderLine = self.env["odfe.pos.order.line"]
        Payment = self.env["odfe.payment"]

        paid_orders = Order.search(domain)

        total_revenue = sum(paid_orders.mapped("total"))
        total_orders = len(paid_orders)
        avg_order_value = total_revenue / total_orders if total_orders else 0.0

        customer_ids = set(paid_orders.mapped("customer_id").filtered(lambda c: c.id).ids)
        total_customers = len(customer_ids)

        top_products = self._get_top_products(date_from, date_to)
        top_categories = self._get_top_categories(date_from, date_to)
        hourly_sales = self._get_hourly_sales(date_from, date_to)
        daily_sales = self._get_daily_sales(date_from, date_to)
        payment_breakdown = self._get_payment_breakdown(date_from, date_to)

        return {
            "total_revenue": total_revenue,
            "total_orders": total_orders,
            "avg_order_value": avg_order_value,
            "total_customers": total_customers,
            "top_products": top_products,
            "top_categories": top_categories,
            "hourly_sales": hourly_sales,
            "daily_sales": daily_sales,
            "payment_method_breakdown": payment_breakdown,
        }

    @api.model
    def _get_top_products(self, date_from, date_to):
        OrderLine = self.env["odfe.pos.order.line"]
        query = """
            SELECT
                p.id AS product_id,
                p.name AS product_name,
                SUM(l.quantity) AS total_qty,
                SUM(l.price_subtotal) AS total_revenue
            FROM odfe_pos_order_line l
            JOIN odfe_pos_order o ON o.id = l.order_id
            JOIN odfe_product p ON p.id = l.product_id
            WHERE o.state = 'paid'
                AND o.paid_at >= %s
                AND o.paid_at <= %s
            GROUP BY p.id, p.name
            ORDER BY total_revenue DESC
            LIMIT 10
        """
        self.env.cr.execute(query, (date_from, date_to))
        rows = self.env.cr.dictfetchall()
        return rows

    @api.model
    def _get_top_categories(self, date_from, date_to):
        query = """
            SELECT
                pc.id AS category_id,
                pc.name AS category_name,
                SUM(l.price_subtotal) AS total_revenue,
                SUM(l.quantity) AS total_qty
            FROM odfe_pos_order_line l
            JOIN odfe_pos_order o ON o.id = l.order_id
            JOIN odfe_product p ON p.id = l.product_id
            JOIN odfe_product_category pc ON pc.id = p.category_id
            WHERE o.state = 'paid'
                AND o.paid_at >= %s
                AND o.paid_at <= %s
            GROUP BY pc.id, pc.name
            ORDER BY total_revenue DESC
            LIMIT 10
        """
        self.env.cr.execute(query, (date_from, date_to))
        return self.env.cr.dictfetchall()

    @api.model
    def _get_hourly_sales(self, date_from, date_to):
        query = """
            SELECT
                EXTRACT(HOUR FROM o.paid_at) AS hour,
                COUNT(DISTINCT o.id) AS orders,
                SUM(o.total) AS revenue
            FROM odfe_pos_order o
            WHERE o.state = 'paid'
                AND o.paid_at >= %s
                AND o.paid_at <= %s
            GROUP BY EXTRACT(HOUR FROM o.paid_at)
            ORDER BY hour
        """
        self.env.cr.execute(query, (date_from, date_to))
        rows = self.env.cr.dictfetchall()
        result = {int(r["hour"]): {"orders": r["orders"], "revenue": float(r["revenue"] or 0.0)} for r in rows}
        for h in range(24):
            result.setdefault(h, {"orders": 0, "revenue": 0.0})
        return [result[h] for h in sorted(result)]

    @api.model
    def _get_daily_sales(self, date_from, date_to):
        query = """
            SELECT
                DATE(o.paid_at) AS date,
                COUNT(DISTINCT o.id) AS orders,
                SUM(o.total) AS revenue,
                AVG(o.total) AS avg_order
            FROM odfe_pos_order o
            WHERE o.state = 'paid'
                AND o.paid_at >= %s
                AND o.paid_at <= %s
            GROUP BY DATE(o.paid_at)
            ORDER BY date
        """
        self.env.cr.execute(query, (date_from, date_to))
        return self.env.cr.dictfetchall()

    @api.model
    def _get_payment_breakdown(self, date_from, date_to):
        query = """
            SELECT
                pm.name AS method_name,
                pm.type AS method_type,
                SUM(p.amount) AS total,
                COUNT(DISTINCT p.id) AS count
            FROM odfe_payment p
            JOIN odfe_payment_method pm ON pm.id = p.method_id
            JOIN odfe_pos_order o ON o.id = p.order_id
            WHERE o.state = 'paid'
                AND o.paid_at >= %s
                AND o.paid_at <= %s
                AND p.state = 'completed'
            GROUP BY pm.name, pm.type
            ORDER BY total DESC
        """
        self.env.cr.execute(query, (date_from, date_to))
        return self.env.cr.dictfetchall()

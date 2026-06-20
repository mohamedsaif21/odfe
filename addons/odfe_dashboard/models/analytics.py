from odoo import api, fields, models, _
from datetime import timedelta
from dateutil.relativedelta import relativedelta


class OdfeAnalytics(models.Model):
    _name = "odfe.analytics"
    _description = "Daily Sales Analytics"
    _order = "date desc"
    _rec_name = "date"

    date = fields.Date(string="Date", required=True, index=True)
    revenue = fields.Monetary(string="Revenue", currency_field="currency_id")
    orders_count = fields.Integer(string="Orders Count", default=0)
    avg_order = fields.Monetary(string="Average Order Value", currency_field="currency_id")
    customers_count = fields.Integer(string="Customers Count", default=0)
    top_product_id = fields.Many2one("odfe.product", string="Top Product")

    revenue_growth = fields.Float(string="Revenue Growth (%)", compute="_compute_growth", store=True)
    order_growth = fields.Float(string="Order Growth (%)", compute="_compute_growth", store=True)

    currency_id = fields.Many2one("res.currency", related="company_id.currency_id", string="Currency")
    company_id = fields.Many2one("res.company", string="Company", default=lambda self: self.env.company)

    _sql_constraints = [
        ("unique_date_company", "UNIQUE(date, company_id)", "Analytics for this date and company already exist."),
    ]

    @api.depends("revenue", "orders_count")
    def _compute_growth(self):
        for record in self:
            prev_date = record.date - relativedelta(days=1)
            prev = self.search([("date", "=", prev_date), ("company_id", "=", record.company_id.id)], limit=1)
            if prev and prev.revenue:
                record.revenue_growth = ((record.revenue - prev.revenue) / prev.revenue) * 100.0
            else:
                record.revenue_growth = 0.0
            if prev and prev.orders_count:
                record.order_growth = ((record.orders_count - prev.orders_count) / prev.orders_count) * 100.0
            else:
                record.order_growth = 0.0

    @api.model
    def compute_daily_snapshot(self):
        today = fields.Date.today()
        today_dt = fields.Datetime.now().replace(hour=0, minute=0, second=0)
        tomorrow_dt = today_dt + timedelta(days=1)

        Order = self.env["odfe.pos.order"]
        Payment = self.env["odfe.payment"]
        companies = self.env["res.company"].search([])

        for company in companies:
            domain = [
                ("state", "=", "paid"),
                ("paid_at", ">=", today_dt),
                ("paid_at", "<", tomorrow_dt),
                ("company_id", "=", company.id),
            ]
            orders = Order.search(domain)
            revenue = sum(orders.mapped("total"))
            orders_count = len(orders)
            avg_order = revenue / orders_count if orders_count else 0.0
            customer_ids = set(orders.mapped("customer_id").filtered(lambda c: c.id).ids)
            customers_count = len(customer_ids)

            top_product = False
            if orders_count:
                line_data = orders.mapped("line_ids")
                if line_data:
                    product_qty = {}
                    for line in line_data:
                        pid = line.product_id.id
                        product_qty[pid] = product_qty.get(pid, 0) + line.quantity
                    if product_qty:
                        top_pid = max(product_qty, key=product_qty.get)
                        top_product = self.env["odfe.product"].browse(top_pid)

            existing = self.search([("date", "=", today), ("company_id", "=", company.id)], limit=1)
            vals = {
                "date": today,
                "revenue": revenue,
                "orders_count": orders_count,
                "avg_order": avg_order,
                "customers_count": customers_count,
                "top_product_id": top_product and top_product.id or False,
                "company_id": company.id,
            }
            if existing:
                existing.write(vals)
            else:
                self.create(vals)
        return True

    @api.model
    def get_trend(self, period="month"):
        today = fields.Date.today()
        if period == "day":
            start = today
            prev_start = start - relativedelta(days=1)
            prev_end = start
        elif period == "week":
            start = today - timedelta(days=7)
            prev_start = start - timedelta(days=7)
            prev_end = start
        elif period == "year":
            start = today - relativedelta(years=1)
            prev_start = start - relativedelta(years=1)
            prev_end = start
        else:
            start = today - relativedelta(months=1)
            prev_start = start - relativedelta(months=1)
            prev_end = start

        current = self.search([("date", ">=", start), ("date", "<=", today)])
        previous = self.search([("date", ">=", prev_start), ("date", "<", prev_end)])

        current_rev = sum(current.mapped("revenue"))
        prev_rev = sum(previous.mapped("revenue"))
        current_orders = sum(current.mapped("orders_count"))
        prev_orders = sum(previous.mapped("orders_count"))

        revenue_growth = ((current_rev - prev_rev) / prev_rev * 100.0) if prev_rev else 0.0
        order_growth = ((current_orders - prev_orders) / prev_orders * 100.0) if prev_orders else 0.0

        return {
            "current_revenue": current_rev,
            "previous_revenue": prev_rev,
            "revenue_growth": revenue_growth,
            "current_orders": current_orders,
            "previous_orders": prev_orders,
            "order_growth": order_growth,
        }

    @api.model
    def compute_snapshot_cron(self):
        self.compute_daily_snapshot()
        return True

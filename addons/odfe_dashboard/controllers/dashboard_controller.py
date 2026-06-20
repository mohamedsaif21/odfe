import json
from datetime import datetime

from odoo import http, fields, _
from odoo.http import request


class OdpeDashboardController(http.Controller):

    @http.route("/dashboard", type="http", auth="user", website=True)
    def dashboard_main(self):
        return request.render("odfe_dashboard.dashboard_page", {})

    @http.route("/api/dashboard/data", type="json", auth="user", methods=["POST"])
    def dashboard_data(self, date_from=None, date_to=None, period="month"):
        if date_from:
            date_from = datetime.fromisoformat(date_from)
        if date_to:
            date_to = datetime.fromisoformat(date_to)
        dashboard = request.env["odfe.dashboard.sales"]
        data = dashboard.get_dashboard_data(date_from, date_to, period)
        trend = request.env["odfe.analytics"].get_trend(period)
        data.update(trend)
        return data

    @http.route("/api/dashboard/product/top", type="json", auth="user", methods=["POST"])
    def top_products(self, date_from=None, date_to=None, limit=10):
        if date_from:
            date_from = datetime.fromisoformat(date_from)
        if date_to:
            date_to = datetime.fromisoformat(date_to)
        dashboard = request.env["odfe.dashboard.sales"]
        data = dashboard.get_dashboard_data(date_from, date_to, "month")
        return {"top_products": data.get("top_products", [])[:limit]}

    @http.route("/api/dashboard/sales/hourly", type="json", auth="user", methods=["POST"])
    def hourly_sales(self, date_from=None, date_to=None):
        if date_from:
            date_from = datetime.fromisoformat(date_from)
        if date_to:
            date_to = datetime.fromisoformat(date_to)
        dashboard = request.env["odfe.dashboard.sales"]
        data = dashboard.get_dashboard_data(date_from, date_to, "day")
        return {"hourly_sales": data.get("hourly_sales", [])}

    @http.route("/api/dashboard/report/generate", type="json", auth="user", methods=["POST"])
    def generate_report(self, name=None, report_type="sales", date_from=None, date_to=None):
        report = request.env["odfe.dashboard.report"].create({
            "name": name or _("Report %s") % fields.Datetime.now(),
            "type": report_type,
            "date_from": date_from and datetime.fromisoformat(date_from),
            "date_to": date_to and datetime.fromisoformat(date_to),
        })
        report.generate()
        return {
            "id": report.id,
            "name": report.name,
            "report_data": report.report_data,
            "chart_data": report.chart_data,
            "generated_at": report.generated_at.isoformat() if report.generated_at else False,
        }

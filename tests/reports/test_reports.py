from odoo.tests import TransactionCase, tagged
from datetime import date, datetime, timedelta
from odoo import fields


@tagged('odfe', 'reports', 'pos')
class TestSalesReport(TransactionCase):

    def setUp(self):
        super().setUp()
        self.floor = self.env['odfe.floor'].create({
            'name': 'Report Floor',
            'code': 'RPT01',
        })
        self.table = self.env['odfe.table'].create({
            'name': 'Rpt-Table',
            'floor_id': self.floor.id,
        })
        self.product_tmpl = self.env['product.template'].create({
            'name': 'Rpt Product',
            'list_price': 20.00,
            'type': 'product',
        })
        self.product = self.env['odfe.product'].create({
            'product_tmpl_id': self.product_tmpl.id,
        })
        self.session = self.env['odfe.pos.session'].create({
            'user_id': self.env.user.id,
        })
        self.session.action_open()
        self.order = self.env['odfe.pos.order'].create({
            'session_id': self.session.id,
            'table_id': self.table.id,
            'ordered_at': fields.Datetime.now(),
        })
        self.env['odfe.pos.order.line'].create({
            'order_id': self.order.id,
            'product_id': self.product.id,
            'quantity': 3.0,
            'price_unit': 20.00,
        })
        self.order.action_confirm()
        self.order.action_pay()

    def test_sales_report_data_aggregation(self):
        report = self.env['odfe.report.sales']
        today = date.today()
        result = report.get_sales_report(
            date_from=today,
            date_to=today,
            period='daily',
        )
        self.assertGreaterEqual(result['total_revenue'], 60.0)
        self.assertGreaterEqual(result['total_orders'], 1)

    def test_sales_report_empty(self):
        report = self.env['odfe.report.sales']
        future = date.today() + timedelta(days=365)
        result = report.get_sales_report(
            date_from=future,
            date_to=future,
        )
        self.assertEqual(result['total_revenue'], 0)
        self.assertEqual(result['total_orders'], 0)

    def test_sales_summary(self):
        report = self.env['odfe.report.sales']
        today = date.today()
        summary = report.get_summary(
            date_from=today,
            date_to=today,
        )
        self.assertGreaterEqual(summary['total_revenue'], 60.0)
        self.assertGreaterEqual(summary['total_orders'], 1)
        self.assertIn('average_order_value', summary)
        self.assertIn('cancelled_orders', summary)

    def test_daily_breakdown(self):
        report = self.env['odfe.report.sales']
        today = date.today()
        breakdown = report.get_daily_breakdown(
            date_from=today,
            date_to=today,
        )
        self.assertTrue(len(breakdown) > 0)
        self.assertEqual(breakdown[0]['revenue'], 60.0)
        self.assertEqual(breakdown[0]['orders'], 1)

    def test_payment_breakdown(self):
        method = self.env['odfe.payment.method'].create({
            'name': 'Cash',
            'code': 'CASH',
            'type': 'cash',
        })
        self.env['odfe.payment'].create({
            'order_id': self.order.id,
            'session_id': self.session.id,
            'method_id': method.id,
            'amount': 60.00,
            'state': 'completed',
        })
        report = self.env['odfe.report.sales']
        today = date.today()
        breakdown = report.get_payment_breakdown(
            date_from=today,
            date_to=today,
        )
        self.assertTrue(len(breakdown) > 0)
        self.assertEqual(breakdown[0]['method'], 'Cash')
        self.assertEqual(breakdown[0]['amount'], 60.00)

    def test_period_key_daily(self):
        report = self.env['odfe.report.sales']
        dt = datetime.now()
        key = report._get_period_key(dt, 'daily')
        self.assertEqual(key, fields.Datetime.to_string(dt)[:10])

    def test_period_key_monthly(self):
        report = self.env['odfe.report.sales']
        dt = datetime(2025, 6, 15, 10, 0, 0)
        key = report._get_period_key(dt, 'monthly')
        self.assertEqual(key, '2025-06')

    def test_period_key_weekly(self):
        report = self.env['odfe.report.sales']
        dt = datetime(2025, 6, 15, 10, 0, 0)
        key = report._get_period_key(dt, 'weekly')
        self.assertIn('2025-W', key)

    def test_period_key_yearly(self):
        report = self.env['odfe.report.sales']
        dt = datetime(2025, 6, 15, 10, 0, 0)
        key = report._get_period_key(dt, 'yearly')
        self.assertEqual(key, '2025')

    def test_report_category_filter(self):
        category = self.env['odfe.product.category'].create({
            'name': 'Filter Cat',
        })
        report = self.env['odfe.report.sales']
        today = date.today()
        result = report.get_sales_report(
            date_from=today,
            date_to=today,
            category_id=category.id,
        )
        self.assertEqual(result['total_revenue'], 0)

    def test_report_with_cancelled_orders(self):
        cancelled = self.env['odfe.pos.order'].create({
            'session_id': self.session.id,
            'state': 'cancelled',
        })
        report = self.env['odfe.report.sales']
        today = date.today()
        result = report.get_sales_report(
            date_from=today,
            date_to=today,
        )
        paid_orders = result['total_orders']
        self.assertGreaterEqual(paid_orders, 1)


@tagged('odfe', 'reports', 'pos')
class TestReportsPdf(TransactionCase):

    def setUp(self):
        super().setUp()
        self.floor = self.env['odfe.floor'].create({
            'name': 'PDF Floor',
            'code': 'PDF01',
        })
        self.table = self.env['odfe.table'].create({
            'name': 'Pdf-Table',
            'floor_id': self.floor.id,
        })
        self.product_tmpl = self.env['product.template'].create({
            'name': 'PDF Product',
            'list_price': 15.00,
            'type': 'product',
        })
        self.product = self.env['odfe.product'].create({
            'product_tmpl_id': self.product_tmpl.id,
        })
        self.session = self.env['odfe.pos.session'].create({
            'user_id': self.env.user.id,
        })
        self.session.action_open()
        self.order = self.env['odfe.pos.order'].create({
            'session_id': self.session.id,
            'table_id': self.table.id,
        })
        self.env['odfe.pos.order.line'].create({
            'order_id': self.order.id,
            'product_id': self.product.id,
            'quantity': 2.0,
            'price_unit': 15.00,
        })
        self.order.action_confirm()
        self.order.action_pay()

    def test_sales_pdf_generation(self):
        pdf_model = self.env['odfe.report.pdf']
        report = self.env['odfe.report.sales']
        today = date.today()
        summary = report.get_summary(date_from=today, date_to=today)
        breakdown = report.get_daily_breakdown(date_from=today, date_to=today)
        data = {
            'summary': summary,
            'breakdown': breakdown,
            'date_from': str(today),
            'date_to': str(today),
        }
        pdf = pdf_model.generate_sales_pdf(data)
        self.assertTrue(pdf)
        self.assertGreater(len(pdf), 0)

    def test_order_pdf_generation(self):
        pdf_model = self.env['odfe.report.pdf']
        pdf = pdf_model.generate_order_pdf(self.order.id)
        self.assertTrue(pdf)
        self.assertGreater(len(pdf), 0)

    def test_order_pdf_invalid_id(self):
        pdf_model = self.env['odfe.report.pdf']
        pdf = pdf_model.generate_order_pdf(99999)
        self.assertEqual(pdf, b'')

    def test_generic_report_pdf(self):
        pdf_model = self.env['odfe.report.pdf']
        data = {
            'summary': {'total_revenue': 100.0, 'total_orders': 5},
            'date_from': '2025-01-01',
            'date_to': '2025-01-31',
        }
        pdf = pdf_model.generate_report_pdf('sales', data)
        self.assertTrue(pdf)
        self.assertGreater(len(pdf), 0)

    def test_generic_report_pdf_with_breakdown(self):
        pdf_model = self.env['odfe.report.pdf']
        data = {
            'summary': {'total_revenue': 200.0, 'total_orders': 10},
            'data': [
                {'date': '2025-01-01', 'revenue': 100.0, 'orders': 5},
                {'date': '2025-01-02', 'revenue': 100.0, 'orders': 5},
            ],
        }
        pdf = pdf_model.generate_report_pdf('revenue', data)
        self.assertTrue(pdf)


@tagged('odfe', 'reports', 'pos')
class TestReportsXlsx(TransactionCase):

    def setUp(self):
        super().setUp()
        self.floor = self.env['odfe.floor'].create({
            'name': 'XLSX Floor',
            'code': 'XLS01',
        })
        self.table = self.env['odfe.table'].create({
            'name': 'Xlsx-Table',
            'floor_id': self.floor.id,
        })
        self.product_tmpl = self.env['product.template'].create({
            'name': 'XLSX Product',
            'list_price': 10.00,
            'type': 'product',
        })
        self.product = self.env['odfe.product'].create({
            'product_tmpl_id': self.product_tmpl.id,
        })
        self.session = self.env['odfe.pos.session'].create({
            'user_id': self.env.user.id,
        })
        self.session.action_open()
        self.order = self.env['odfe.pos.order'].create({
            'session_id': self.session.id,
            'table_id': self.table.id,
        })
        self.env['odfe.pos.order.line'].create({
            'order_id': self.order.id,
            'product_id': self.product.id,
            'quantity': 5.0,
            'price_unit': 10.00,
        })
        self.order.action_confirm()
        self.order.action_pay()

    def test_sales_xlsx_generation(self):
        xlsx_model = self.env['odfe.report.xlsx']
        report = self.env['odfe.report.sales']
        today = date.today()
        summary = report.get_summary(date_from=today, date_to=today)
        breakdown = report.get_daily_breakdown(date_from=today, date_to=today)
        data = {
            'summary': summary,
            'breakdown': breakdown,
            'date_from': str(today),
            'date_to': str(today),
        }
        xlsx = xlsx_model.generate_sales_xlsx(data)
        self.assertTrue(xlsx)
        self.assertGreater(len(xlsx), 0)

    def test_generic_report_xlsx(self):
        xlsx_model = self.env['odfe.report.xlsx']
        data = {
            'summary': {'total_revenue': 500.0, 'total_orders': 25},
            'breakdown': [
                {'label': '2025-01-01', 'revenue': 500.0, 'orders': 25},
            ],
            'date_from': '2025-01-01',
            'date_to': '2025-01-31',
        }
        xlsx = xlsx_model.generate_report_xlsx('sales', data)
        self.assertTrue(xlsx)
        self.assertGreater(len(xlsx), 0)

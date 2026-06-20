import io
import logging
from datetime import datetime

from odoo import _, api, fields, models

try:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.pagesizes import A4, letter
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
    )
except ImportError:
    _logger = logging.getLogger(__name__)
    _logger.warning("reportlab is not installed. PDF export will not work.")

_logger = logging.getLogger(__name__)


class OdfeReportPdf(models.AbstractModel):
    _name = 'odfe.report.pdf'
    _description = 'PDF Report Generator'

    def generate_sales_pdf(self, data):
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm)
        styles = getSampleStyleSheet()
        elements = self._build_header(doc, 'Sales Report', data, styles)
        elements.append(Spacer(1, 6*mm))

        summary = data.get('summary', {})
        summary_data = [
            ['Total Revenue', f"${summary.get('total_revenue', 0):,.2f}"],
            ['Total Orders', str(summary.get('total_orders', 0))],
            ['Total Discounts', f"${summary.get('total_discounts', 0):,.2f}"],
            ['Total Taxes', f"${summary.get('total_taxes', 0):,.2f}"],
            ['Avg Order Value', f"${summary.get('average_order_value', 0):,.2f}"],
        ]
        elements.append(self._make_table(summary_data, col_widths=[120, 100], header=False))
        elements.append(Spacer(1, 6*mm))

        breakdown = data.get('breakdown', [])
        if breakdown:
            elements.append(Paragraph('<b>Daily Breakdown</b>', styles['Heading3']))
            elements.append(Spacer(1, 3*mm))
            header = ['Date', 'Revenue', 'Orders', 'Discounts', 'Taxes']
            rows = [[
                r.get('label', ''),
                f"${r.get('revenue', 0):,.2f}",
                str(r.get('orders', 0)),
                f"${r.get('discounts', 0):,.2f}",
                f"${r.get('taxes', 0):,.2f}",
            ] for r in breakdown]
            elements.append(self._make_table(
                [header] + rows,
                col_widths=[80, 70, 50, 70, 70],
            ))

        doc.build(elements)
        pdf = buf.getvalue()
        buf.close()
        return pdf

    def generate_order_pdf(self, order_id):
        order = self.env['odfe.pos.order'].browse(int(order_id))
        if not order:
            return b''

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=letter, topMargin=15*mm, bottomMargin=15*mm)
        styles = getSampleStyleSheet()
        elements = []

        title_style = ParagraphStyle('TitleCenter', parent=styles['Title'], alignment=TA_CENTER)
        elements.append(Paragraph('Order Receipt', title_style))
        elements.append(Spacer(1, 4*mm))

        info_data = [
            ['Order:', order.name],
            ['Date:', fields.Datetime.to_string(order.ordered_at) if order.ordered_at else ''],
            ['Table:', order.table_id.name if order.table_id else 'Takeaway'],
            ['Customer:', order.customer_id.name if order.customer_id else 'Guest'],
            ['Employee:', order.employee_id.name if order.employee_id else ''],
            ['Status:', dict(order._fields['state'].selection).get(order.state, order.state)],
        ]
        elements.append(self._make_table(info_data, col_widths=[80, 160], header=False))
        elements.append(Spacer(1, 6*mm))

        elements.append(Paragraph('<b>Order Lines</b>', styles['Heading3']))
        elements.append(Spacer(1, 3*mm))

        header = ['Item', 'Qty', 'Price', 'Subtotal']
        rows = [[
            line.product_name or line.product_id.name,
            str(line.quantity),
            f"${line.price_unit:.2f}",
            f"${line.subtotal:.2f}",
        ] for line in order.line_ids if not line.is_modifier]

        rows.append(['', '', '', ''])
        rows.append(['Subtotal', '', '', f"${order.subtotal:.2f}"])
        rows.append(['Tax', '', '', f"${order.tax_amount:.2f}"])
        rows.append(['Discount', '', '', f"-${order.discount_total:.2f}"])
        bold_style = ParagraphStyle('Bold', parent=styles['Normal'], fontName='Helvetica-Bold')
        rows.append([Paragraph('<b>Total</b>', bold_style), '', '', Paragraph(f"<b>${order.total:.2f}</b>", bold_style)])

        elements.append(self._make_table(
            [header] + rows, col_widths=[140, 40, 60, 60],
        ))

        doc.build(elements)
        pdf = buf.getvalue()
        buf.close()
        return pdf

    def generate_report_pdf(self, report_type, data):
        title_map = {
            'sales': 'Sales Report',
            'orders': 'Orders Report',
            'revenue': 'Revenue Report',
            'products': 'Products Report',
            'employees': 'Employee Performance Report',
            'sessions': 'Session Report',
        }
        title = title_map.get(report_type, 'Report')

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm)
        styles = getSampleStyleSheet()
        elements = self._build_header(doc, title, data, styles)
        elements.append(Spacer(1, 6*mm))

        if data.get('summary'):
            s = data['summary']
            summary_data = [
                ['Total Revenue', f"${s.get('total_revenue', 0):,.2f}"],
                ['Total Orders', str(s.get('total_orders', 0))],
            ]
            if 'total_taxes' in s:
                summary_data.append(['Total Taxes', f"${s['total_taxes']:,.2f}"])
            if 'total_discounts' in s:
                summary_data.append(['Total Discounts', f"${s['total_discounts']:,.2f}"])
            elements.append(self._make_table(summary_data, col_widths=[120, 100], header=False))
            elements.append(Spacer(1, 6*mm))

        breakdown = data.get('breakdown', data.get('data', []))
        if breakdown and isinstance(breakdown, list) and breakdown:
            first = breakdown[0]
            header = list(first.keys())
            header_labels = [h.replace('_', ' ').title() for h in header]
            rows = []
            for r in breakdown:
                row = []
                for h in header:
                    v = r.get(h, '')
                    if isinstance(v, float):
                        row.append(f"${v:,.2f}" if abs(v) < 100000 else f"${v:,.2f}")
                    else:
                        row.append(str(v))
                rows.append(row)
            col_widths = [max(180 // len(header), 40)] * len(header)
            elements.append(self._make_table([header_labels] + rows, col_widths=col_widths))

        doc.build(elements)
        pdf = buf.getvalue()
        buf.close()
        return pdf

    def _build_header(self, doc, title, data, styles):
        elements = []
        title_style = ParagraphStyle(
            'ReportTitle', parent=styles['Title'], alignment=TA_CENTER,
            fontSize=18, spaceAfter=6,
        )
        elements.append(Paragraph(title, title_style))
        elements.append(Spacer(1, 3*mm))

        company = self.env.company
        info = [
            f"<b>Company:</b> {company.name}",
            f"<b>Date:</b> {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        ]
        if data.get('date_from'):
            info.append(f"<b>Period:</b> {data['date_from']} to {data.get('date_to', data['date_from'])}")
        elements.append(Paragraph(' | '.join(info), styles['Normal']))
        elements.append(Spacer(1, 2*mm))
        elements.append(Paragraph('<hr/>', styles['Normal']))
        return elements

    def _make_table(self, data, col_widths=None, header=True):
        style_cmds = [
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]
        if header and data:
            style_cmds += [
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2E5090')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ]
        if data:
            for i in range(1, len(data)):
                if i % 2 == 0:
                    style_cmds.append(
                        ('BACKGROUND', (0, i), (-1, i), colors.HexColor('#F0F0F0'))
                    )
        t = Table(data, colWidths=col_widths, repeatRows=1 if header else 0)
        t.setStyle(TableStyle(style_cmds))
        return t

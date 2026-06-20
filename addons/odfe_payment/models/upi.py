from odoo import models, fields


class OdpePaymentUpi(models.Model):
    _name = 'odfe.payment.upi'
    _description = 'ODFE UPI Payment'
    _inherit = 'odfe.payment'

    upi_id = fields.Char(string='UPI ID', help='e.g. user@paytm')
    transaction_id = fields.Char(string='Transaction ID', copy=False)
    qr_code = fields.Binary(string='QR Code', attachment=True)
    upi_app = fields.Selection([
        ('gpay', 'Google Pay'),
        ('phonepe', 'PhonePe'),
        ('paytm', 'Paytm'),
        ('other', 'Other'),
    ], string='UPI App', default='other')
    approved_at = fields.Datetime(string='Approved At')

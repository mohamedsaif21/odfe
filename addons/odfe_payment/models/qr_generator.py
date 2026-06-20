import base64
import io
import logging

from odoo import models, fields, api, _
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)

try:
    import qrcode
    from qrcode.image.pil import PilImage
except ImportError:
    qrcode = None
    PilImage = None


class OdpePaymentQrGenerator(models.Model):
    _name = 'odfe.payment.qr.generator'
    _description = 'ODFE QR Code Generator'
    _rec_name = 'name'

    name = fields.Char(string='Name', required=True)
    upi_id = fields.Char(string='UPI ID', required=True, help='UPI ID for payment (e.g. merchant@upi)')
    merchant_name = fields.Char(string='Merchant Name', required=True)
    amount = fields.Monetary(string='Amount', currency_field='currency_id')
    currency_id = fields.Many2one('res.currency', string='Currency',
                                  default=lambda self: self.env.company.currency_id)
    qr_image = fields.Binary(string='QR Image', compute='_compute_qr_image', store=True)

    def _build_upi_payload(self):
        self.ensure_one()
        # UPI deep link: upi://pay?pa=merchant@upi&pn=MerchantName&am=100.00&cu=INR
        amount_str = f'{self.amount:.2f}' if self.amount else ''
        currency = self.currency_id.name if self.currency_id else 'INR'
        payload = f'upi://pay?pa={self.upi_id}&pn={self.merchant_name}'
        if amount_str:
            payload += f'&am={amount_str}'
        payload += f'&cu={currency}'
        return payload

    @api.depends('upi_id', 'merchant_name', 'amount', 'currency_id')
    def _compute_qr_image(self):
        if qrcode is None:
            _logger.warning('qrcode library not installed. Skipping QR generation.')
            return
        for rec in self:
            try:
                payload = rec._build_upi_payload()
                qr = qrcode.make(payload)
                buffer = io.BytesIO()
                qr.save(buffer, format='PNG')
                rec.qr_image = base64.b64encode(buffer.getvalue())
            except Exception as e:
                _logger.error('Failed to generate QR code: %s', e)
                rec.qr_image = False

    def generate(self):
        self.ensure_one()
        if qrcode is None:
            raise UserError(_('The "qrcode" Python library is required for QR generation. '
                              'Install it with: pip install qrcode[pil]'))
        self._compute_qr_image()
        return {
            'type': 'ir.actions.act_window',
            'res_model': 'odfe.payment.qr.generator',
            'view_mode': 'form',
            'res_id': self.id,
            'target': 'new',
        }


class OdpePaymentQrWizard(models.TransientModel):
    _name = 'odfe.payment.qr.wizard'
    _description = 'ODFE QR Code Wizard'

    upi_id = fields.Char(string='UPI ID', required=True, default=lambda self: self._default_upi_id())
    merchant_name = fields.Char(string='Merchant Name', required=True, default=lambda self: self._default_merchant())
    amount = fields.Monetary(string='Amount', currency_field='currency_id')
    currency_id = fields.Many2one('res.currency', string='Currency',
                                  default=lambda self: self.env.company.currency_id)
    qr_image = fields.Binary(string='QR Code', readonly=True)
    qr_generator_id = fields.Many2one('odfe.payment.qr.generator', string='QR Generator', readonly=True)

    def _default_upi_id(self):
        config = self.env['odfe.config'].search([], limit=1)
        return config and config.restaurant_name or ''

    def _default_merchant(self):
        config = self.env['odfe.config'].search([], limit=1)
        return config and config.restaurant_name or ''

    def action_generate(self):
        self.ensure_one()
        generator = self.env['odfe.payment.qr.generator'].create({
            'name': f'QR_{self.upi_id}_{fields.Datetime.now()}',
            'upi_id': self.upi_id,
            'merchant_name': self.merchant_name,
            'amount': self.amount,
            'currency_id': self.currency_id.id,
        })
        generator.generate()
        self.qr_image = generator.qr_image
        self.qr_generator_id = generator.id
        return {
            'type': 'ir.actions.act_window',
            'res_model': 'odfe.payment.qr.wizard',
            'view_mode': 'form',
            'res_id': self.id,
            'target': 'new',
        }

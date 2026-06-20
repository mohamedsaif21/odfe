import qrcode
import base64
from io import BytesIO

from odoo import api, fields, models, _


class OdfeSelfOrderQrTable(models.Model):
    _name = 'odfe.self.order.qr.table'
    _description = 'Self Order QR Table'
    _rec_name = 'table_id'
    _order = 'id desc'

    table_id = fields.Many2one('odfe.table', string='Table', required=True, ondelete='cascade', index=True)
    qr_code = fields.Binary(string='QR Code Image', attachment=True)
    qr_token = fields.Char(string='QR Token', required=True, copy=False, index=True)
    active = fields.Boolean(string='Active', default=True)
    generated_at = fields.Datetime(string='Generated At', default=fields.Datetime.now)

    _sql_constraints = [
        ('unique_table_qr', 'UNIQUE(table_id)', 'A QR code already exists for this table.'),
        ('unique_qr_token', 'UNIQUE(qr_token)', 'The QR token must be unique.'),
    ]

    def generate_qr(self):
        self.ensure_one()
        base_url = self.env['ir.config_parameter'].sudo().get_param('web.base.url')
        url = f'{base_url}/self-order/{self.qr_token}'
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color='black', back_color='white')
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        self.qr_code = base64.b64encode(buffer.getvalue())
        self.generated_at = fields.Datetime.now()
        return True

    @api.model
    def get_or_create(self, table_id):
        existing = self.search([('table_id', '=', table_id)], limit=1)
        if existing:
            if not existing.qr_code:
                existing.generate_qr()
            return existing
        import secrets
        token = secrets.token_urlsafe(32)
        record = self.create({
            'table_id': table_id,
            'qr_token': token,
            'generated_at': fields.Datetime.now(),
        })
        record.generate_qr()
        return record

    def action_regenerate_qr(self):
        self.ensure_one()
        import secrets
        self.qr_token = secrets.token_urlsafe(32)
        self.generate_qr()
        return True

    def name_get(self):
        return [(r.id, f'QR - {r.table_id.name}') for r in self]

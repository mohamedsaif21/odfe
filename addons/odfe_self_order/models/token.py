import uuid
from datetime import timedelta

from odoo import api, fields, models, _


class OdpeSelfOrderToken(models.Model):
    _name = 'odfe.self.order.token'
    _description = 'Self Order Session Token'
    _rec_name = 'token'
    _order = 'id desc'

    token = fields.Char(string='Token', required=True, copy=False, index=True)
    table_id = fields.Many2one('odfe.table', string='Table', required=True, ondelete='cascade')
    session_id = fields.Char(string='Browser Session ID')
    customer_id = fields.Many2one('odfe.customer', string='Customer', ondelete='set null')
    created_at = fields.Datetime(string='Created At', default=fields.Datetime.now)
    expires_at = fields.Datetime(string='Expires At')
    active = fields.Boolean(string='Active', default=True)

    _sql_constraints = [
        ('unique_token', 'UNIQUE(token)', 'The session token must be unique.'),
    ]

    @api.model
    def generate(self, table_id, customer_id=None, session_id=None):
        token_str = str(uuid.uuid4())
        now = fields.Datetime.now()
        record = self.create({
            'token': token_str,
            'table_id': table_id,
            'customer_id': customer_id,
            'session_id': session_id,
            'created_at': now,
            'expires_at': now + timedelta(hours=24),
            'active': True,
        })
        return record

    @api.model
    def validate_token(self, token):
        if not token:
            return False
        now = fields.Datetime.now()
        record = self.search([
            ('token', '=', token),
            ('active', '=', True),
            ('expires_at', '>', now),
        ], limit=1)
        if record:
            return record.table_id
        return False

    def action_expire(self):
        self.write({'active': False})

    @api.model
    def _cron_expire_tokens(self):
        now = fields.Datetime.now()
        expired = self.search([
            ('active', '=', True),
            ('expires_at', '<=', now),
        ])
        expired.write({'active': False})
        return len(expired)

from datetime import datetime, timedelta

from odoo import models, fields, api
from odoo.tools import DEFAULT_SERVER_DATETIME_FORMAT


class WebsocketConnection(models.Model):
    _name = 'odfe.websocket.connection'
    _description = 'ODFE WebSocket Connection'
    _order = 'connected_at DESC'

    user_id = fields.Many2one('res.users', string='User', required=True, ondelete='cascade')
    channel = fields.Char(string='Channel', required=True, index=True)
    session_id = fields.Char(string='Session ID', required=True, index=True)
    connected_at = fields.Datetime(string='Connected At', default=fields.Datetime.now, required=True)
    last_heartbeat = fields.Datetime(string='Last Heartbeat', default=fields.Datetime.now, required=True)
    active = fields.Boolean(string='Active', default=True)

    _sql_constraints = [
        ('unique_session_channel', 'UNIQUE(session_id, channel)',
         'A connection with this session and channel already exists.'),
    ]

    def cleanup_stale(self, minutes=5):
        cutoff = datetime.now() - timedelta(minutes=minutes)
        cutoff_str = cutoff.strftime(DEFAULT_SERVER_DATETIME_FORMAT)
        stale = self.search([
            ('active', '=', True),
            ('last_heartbeat', '<', cutoff_str),
        ])
        count = len(stale)
        stale.write({'active': False})
        return count

    def action_disconnect(self):
        self.write({'active': False})

    @api.model
    def heartbeat(self, session_id, channel):
        connection = self.search([
            ('session_id', '=', session_id),
            ('channel', '=', channel),
            ('active', '=', True),
        ], limit=1)
        if connection:
            connection.write({'last_heartbeat': fields.Datetime.now()})
            return True
        return False

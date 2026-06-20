from datetime import datetime

from odoo import models, fields, api, _


class OdfeBusMessage(models.Model):
    _name = 'odfe.bus.message'
    _description = 'ODFE Bus Message'
    _order = 'created_at DESC'

    channel = fields.Char(string='Channel', required=True, index=True)
    message = fields.Json(string='Message', required=True)
    sender_id = fields.Many2one('res.users', string='Sender', ondelete='set null')
    created_at = fields.Datetime(string='Created At', default=fields.Datetime.now, required=True, index=True)
    delivered = fields.Boolean(string='Delivered', default=False, index=True)

    @api.model
    def send(self, channel, message_type, payload, sender=None):
        bus_message = self.create({
            'channel': channel,
            'message': {
                'type': message_type,
                'payload': payload,
                'timestamp': datetime.utcnow().isoformat(),
            },
            'sender_id': sender or self.env.user.id,
        })

        bus_model = self.env.get('bus.bus')
        if bus_model:
            bus_message._notify_bus(channel, bus_message.message)
        return bus_message

    def _notify_bus(self, channel, message_data):
        bus_model = self.env['bus.bus']
        bus_model.sendone(
            f'odfe_{channel}',
            message_data,
        )

    def mark_delivered(self):
        self.write({'delivered': True})

    @api.model
    def get_undelivered(self, channel):
        return self.search([
            ('channel', '=', channel),
            ('delivered', '=', False),
        ])

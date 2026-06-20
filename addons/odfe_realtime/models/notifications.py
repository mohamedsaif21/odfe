from datetime import datetime

from odoo import models, fields, api


class Notification(models.Model):
    _name = 'odfe.notification'
    _description = 'ODFE Notification'
    _order = 'created_at DESC'

    user_id = fields.Many2one('res.users', string='User', required=True, ondelete='cascade', index=True)
    title = fields.Char(string='Title', required=True)
    message = fields.Text(string='Message', required=True)
    type = fields.Selection([
        ('info', 'Info'),
        ('success', 'Success'),
        ('warning', 'Warning'),
        ('error', 'Error'),
    ], string='Type', default='info', required=True)
    model = fields.Char(string='Related Model')
    res_id = fields.Integer(string='Related Record ID')
    read = fields.Boolean(string='Read', default=False, index=True)
    created_at = fields.Datetime(string='Created At', default=fields.Datetime.now, required=True)

    def mark_read(self):
        self.write({'read': True})

    @api.model
    def create_for_user(self, user_id, title, message, type='info', model=None, res_id=None):
        notification = self.create({
            'user_id': user_id,
            'title': title,
            'message': message,
            'type': type,
            'model': model,
            'res_id': res_id,
        })
        bus_model = self.env.get('bus.bus')
        if bus_model:
            bus_model.sendone(
                f'odfe_notifications_{user_id}',
                {
                    'type': 'notification',
                    'payload': {
                        'id': notification.id,
                        'title': notification.title,
                        'message': notification.message,
                        'type': notification.type,
                        'model': notification.model,
                        'res_id': notification.res_id,
                        'created_at': fields.Datetime.to_string(notification.created_at),
                    },
                },
            )
        return notification

    @api.model
    def get_unread_count(self, user_id=None):
        user_id = user_id or self.env.user.id
        return self.search_count([
            ('user_id', '=', user_id),
            ('read', '=', False),
        ])

    @api.model
    def get_unread(self, user_id=None, limit=50):
        user_id = user_id or self.env.user.id
        return self.search([
            ('user_id', '=', user_id),
            ('read', '=', False),
        ], limit=limit)

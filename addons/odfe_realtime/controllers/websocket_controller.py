import json

from odoo import http
from odoo.http import request
class OdfeRealtimeController(http.Controller):

    @http.route('/odfe/realtime/notifications', type='json', auth='user', methods=['GET'])
    def get_notifications(self, limit=50):
        user_id = request.env.user.id
        Notification = request.env['odfe.notification']
        notifications = Notification.get_unread(user_id=user_id, limit=limit)
        return {
            'count': Notification.get_unread_count(user_id=user_id),
            'notifications': [{
                'id': n.id,
                'title': n.title,
                'message': n.message,
                'type': n.type,
                'model': n.model,
                'res_id': n.res_id,
                'created_at': str(n.created_at),
                'read': n.read,
            } for n in notifications],
        }

    @http.route('/odfe/realtime/mark-read', type='json', auth='user', methods=['POST'])
    def mark_notification_read(self, notification_id=None):
        user_id = request.env.user.id
        domain = [('user_id', '=', user_id)]
        if notification_id:
            domain.append(('id', '=', notification_id))
        else:
            domain.append(('read', '=', False))
        notifications = request.env['odfe.notification'].search(domain)
        count = len(notifications)
        notifications.mark_read()
        return {
            'success': True,
            'marked_read': count,
        }

    @http.route('/odfe/realtime/heartbeat', type='json', auth='user', methods=['POST'])
    def heartbeat(self, session_id=None, channel=None):
        if not session_id or not channel:
            return {'success': False, 'error': 'session_id and channel required'}
        result = request.env['odfe.websocket.connection'].heartbeat(session_id, channel)
        return {'success': result}

    @http.route('/odfe/realtime/sync/status', type='json', auth='user', methods=['GET'])
    def sync_status(self, model_name=None, limit=20):
        domain = []
        if model_name:
            domain.append(('model_name', '=', model_name))
        logs = request.env['odfe.sync.log'].search(
            domain, limit=limit, order='sync_at DESC'
        )
        return [{
            'id': l.id,
            'model_name': l.model_name,
            'res_id': l.res_id,
            'operation': l.operation,
            'status': l.status,
            'sync_at': str(l.sync_at),
            'error_message': l.error_message,
        } for l in logs]

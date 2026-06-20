from datetime import datetime

from odoo import models, fields, api


class SyncLog(models.Model):
    _name = 'odfe.sync.log'
    _description = 'ODFE Sync Log'
    _order = 'sync_at DESC'
    _rec_name = 'display_name'

    model_name = fields.Char(string='Model', required=True, index=True)
    res_id = fields.Integer(string='Record ID', required=True, index=True)
    operation = fields.Selection([
        ('create', 'Create'),
        ('write', 'Write'),
        ('unlink', 'Unlink'),
    ], string='Operation', required=True)
    user_id = fields.Many2one('res.users', string='User', required=True, ondelete='set null')
    sync_at = fields.Datetime(string='Sync At', default=fields.Datetime.now, required=True, index=True)
    status = fields.Selection([
        ('pending', 'Pending'),
        ('synced', 'Synced'),
        ('failed', 'Failed'),
    ], string='Status', default='pending', required=True, index=True)
    error_message = fields.Text(string='Error Message')

    display_name = fields.Char(compute='_compute_display_name', store=False)

    def _compute_display_name(self):
        for record in self:
            record.display_name = f'[{record.operation}] {record.model_name}#{record.res_id}'

    @api.model
    def log_operation(self, model_name, res_id, operation, user_id=None, status='pending'):
        return self.create({
            'model_name': model_name,
            'res_id': res_id,
            'operation': operation,
            'user_id': user_id or self.env.user.id,
            'status': status,
        })

    def mark_synced(self):
        self.write({
            'status': 'synced',
            'error_message': False,
        })

    def mark_failed(self, error_message):
        self.write({
            'status': 'failed',
            'error_message': str(error_message),
        })

    @api.model
    def get_pending_syncs(self, limit=100):
        return self.search([
            ('status', '=', 'pending'),
        ], limit=limit, order='sync_at ASC')

    @api.model
    def cleanup_old_logs(self, days=30):
        from datetime import timedelta
        cutoff = fields.Datetime.now() - timedelta(days=days)
        old = self.search([('sync_at', '<', cutoff)])
        count = len(old)
        old.unlink()
        return count

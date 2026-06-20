from odoo import api, fields, models


class OdpeTableStatusHistory(models.Model):
    _name = 'odfe.table.status.history'
    _description = 'Table Status Change History'
    _order = 'changed_at desc, id desc'

    table_id = fields.Many2one('odfe.table', string='Table', required=True, ondelete='cascade', index=True)
    state_from = fields.Selection([
        ('free', 'Free'),
        ('occupied', 'Occupied'),
        ('reserved', 'Reserved'),
        ('maintenance', 'Maintenance'),
    ], string='From Status', required=True)
    state_to = fields.Selection([
        ('free', 'Free'),
        ('occupied', 'Occupied'),
        ('reserved', 'Reserved'),
        ('maintenance', 'Maintenance'),
    ], string='To Status', required=True)
    changed_by = fields.Many2one('res.users', string='Changed By', default=lambda self: self.env.user)
    changed_at = fields.Datetime(string='Changed At', default=fields.Datetime.now, required=True)
    order_id = fields.Many2one('odfe.pos.order', string='Related Order')

from odoo import api, fields, models


class OdfeTable(models.Model):
    _name = 'odfe.table'
    _description = 'Restaurant Table'
    _order = 'floor_id, pos_y, pos_x'

    name = fields.Char(string='Table Name', required=True)
    floor_id = fields.Many2one('odfe.floor', string='Floor', required=True, ondelete='cascade')
    capacity = fields.Integer(string='Capacity', default=4, required=True)
    shape = fields.Selection([
        ('rectangle', 'Rectangle'),
        ('circle', 'Circle'),
        ('square', 'Square'),
    ], string='Shape', default='rectangle', required=True)
    pos_x = fields.Float(string='X Position', default=0.0)
    pos_y = fields.Float(string='Y Position', default=0.0)
    width = fields.Float(string='Width', default=80.0)
    height = fields.Float(string='Height', default=80.0)
    state = fields.Selection([
        ('free', 'Free'),
        ('occupied', 'Occupied'),
        ('reserved', 'Reserved'),
        ('maintenance', 'Maintenance'),
    ], string='Status', default='free', required=True)
    current_order_id = fields.Many2one(
        'odfe.pos.order', string='Current Order',
        compute='_compute_current_order', store=False,
        help='The active POS order for this table')
    qr_code = fields.Binary(string='QR Code', compute='_compute_qr_code')
    active = fields.Boolean(string='Active', default=True)
    status_change_ids = fields.One2many('odfe.table.status.history', 'table_id', string='Status Changes')

    _sql_constraints = [
        ('check_capacity_positive', 'CHECK(capacity > 0)', 'Table capacity must be greater than zero!'),
    ]

    @api.depends('state')
    def _compute_current_order(self):
        for table in self:
            if table.state == 'occupied':
                order = self.env['odfe.pos.order'].search([
                    ('table_id', '=', table.id),
                    ('state', 'in', ['draft', 'confirmed', 'in_progress']),
                ], limit=1, order='id desc')
                table.current_order_id = order.id if order else False
            else:
                table.current_order_id = False

    @api.depends('name', 'floor_id')
    def _compute_qr_code(self):
        base_url = self.env['ir.config_parameter'].sudo().get_param('web.base.url')
        for table in self:
            if table.name and table.floor_id:
                qr_data = f'{base_url}/self-order/{table.floor_id.code}/{table.id}'
                table.qr_code = qr_data.encode()
            else:
                table.qr_code = False

    def set_occupied(self):
        self.ensure_one()
        self.write({'state': 'occupied'})

    def set_free(self):
        self.ensure_one()
        self.write({'state': 'free'})

    def set_reserved(self):
        self.ensure_one()
        self.write({'state': 'reserved'})

    def _log_status_change(self, state_from, state_to):
        self.env['odfe.table.status.history'].create({
            'table_id': self.id,
            'state_from': state_from,
            'state_to': state_to,
            'changed_by': self.env.user.id,
        })

    def write(self, vals):
        if 'state' in vals:
            for table in self:
                table._log_status_change(table.state, vals['state'])
        return super().write(vals)

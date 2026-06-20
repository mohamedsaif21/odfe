from odoo import api, fields, models, _
from odoo.exceptions import UserError


class OdfeSelfOrderLine(models.Model):
    _name = 'odfe.self.order.line'
    _description = 'Self Order Line'
    _order = 'sequence, id'

    self_order_id = fields.Many2one('odfe.self.order', string='Self Order', required=True, ondelete='cascade')
    product_id = fields.Many2one('odfe.product', string='Product', required=True, ondelete='restrict')
    product_name = fields.Char(string='Product Name', compute='_compute_product_info', store=True)
    quantity = fields.Float(string='Quantity', default=1.0, required=True)
    price_unit = fields.Float(string='Unit Price', required=True)
    price_subtotal = fields.Float(string='Subtotal', compute='_compute_amounts', store=True)
    tax_amount = fields.Float(string='Tax Amount', compute='_compute_amounts', store=True)
    discount_amount = fields.Float(string='Discount Amount', default=0.0)
    subtotal = fields.Float(string='Total', compute='_compute_amounts', store=True)
    note = fields.Text(string='Note')
    sequence = fields.Integer(string='Sequence', default=10)
    is_modifier = fields.Boolean(string='Is Modifier', default=False)
    parent_line_id = fields.Many2one('odfe.self.order.line', string='Parent Line', ondelete='cascade')

    currency_id = fields.Many2one('res.currency', related='self_order_id.currency_id', string='Currency')

    @api.depends('product_id')
    def _compute_product_info(self):
        for line in self:
            if line.product_id:
                line.product_name = line.product_id.name

    @api.depends('quantity', 'price_unit', 'discount_amount')
    def _compute_amounts(self):
        for line in self:
            line.price_subtotal = line.quantity * line.price_unit
            taxable = line.price_subtotal - line.discount_amount
            if line.self_order_id and line.self_order_id.tax_ids:
                tax_rate = sum(line.self_order_id.tax_ids.mapped('rate')) / 100.0
                line.tax_amount = taxable * tax_rate
            else:
                line.tax_amount = 0.0
            line.subtotal = taxable + line.tax_amount

    @api.constrains('quantity')
    def _check_quantity(self):
        for line in self:
            if line.quantity <= 0 and not line.is_modifier:
                raise UserError(_('Quantity must be greater than zero.'))


class OdfeSelfOrder(models.Model):
    _name = 'odfe.self.order'
    _description = 'Self Order'
    _order = 'id desc'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    name = fields.Char(string='Order Ref', required=True, copy=False, readonly=True, default=lambda self: _('New'))
    token = fields.Char(string='Session Token', index=True, copy=False)
    table_id = fields.Many2one('odfe.table', string='Table', ondelete='restrict', index=True)
    customer_id = fields.Many2one('odfe.customer', string='Customer', ondelete='set null')
    session_id = fields.Char(string='Browser Session')

    line_ids = fields.One2many('odfe.self.order.line', 'self_order_id', string='Order Lines', copy=True)

    state = fields.Selection([
        ('draft', 'Draft'),
        ('confirmed', 'Confirmed'),
        ('preparing', 'Preparing'),
        ('ready', 'Ready'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ], string='State', default='draft', required=True, tracking=True)

    subtotal = fields.Float(string='Subtotal', compute='_compute_totals', store=True)
    tax_amount = fields.Float(string='Tax', compute='_compute_totals', store=True)
    total = fields.Float(string='Total', compute='_compute_totals', store=True)
    discount_total = fields.Float(string='Discount Total', compute='_compute_totals', store=True)
    currency_id = fields.Many2one('res.currency', related='company_id.currency_id', string='Currency')
    company_id = fields.Many2one('res.company', string='Company', default=lambda self: self.env.company)
    tax_ids = fields.Many2many('odfe.product.tax', string='Taxes')

    note = fields.Text(string='Note')
    special_instructions = fields.Text(string='Special Instructions')
    pos_order_id = fields.Many2one('odfe.pos.order', string='POS Order', readonly=True, copy=False)
    ordered_at = fields.Datetime(string='Ordered At', default=fields.Datetime.now)
    submitted_at = fields.Datetime(string='Submitted At', readonly=True)

    @api.model
    def create(self, vals):
        if vals.get('name', _('New')) == _('New'):
            vals['name'] = self.env['ir.sequence'].next_by_code('odfe.self.order') or _('New')
        return super().create(vals)

    @api.depends('line_ids.subtotal', 'line_ids.tax_amount', 'line_ids.discount_amount')
    def _compute_totals(self):
        for order in self:
            lines = order.line_ids
            order.subtotal = sum(lines.mapped('price_subtotal'))
            order.tax_amount = sum(lines.mapped('tax_amount'))
            order.discount_total = sum(lines.mapped('discount_amount'))
            order.total = order.subtotal + order.tax_amount - order.discount_total

    def action_submit(self):
        self.ensure_one()
        if self.state != 'draft':
            raise UserError(_('Only draft orders can be submitted.'))
        if not self.line_ids:
            raise UserError(_('Cannot submit an empty order.'))
        self.write({'state': 'confirmed', 'submitted_at': fields.Datetime.now()})
        pos_order = self._create_pos_order()
        if pos_order:
            self.pos_order_id = pos_order
        self._notify_kitchen()
        return True

    def action_preparing(self):
        self.write({'state': 'preparing'})

    def action_ready(self):
        self.write({'state': 'ready'})

    def action_delivered(self):
        self.ensure_one()
        self.write({'state': 'delivered'})
        if self.pos_order_id:
            self.pos_order_id.action_pay()

    def action_cancel(self):
        self.ensure_one()
        if self.state == 'cancelled':
            raise UserError(_('Order is already cancelled.'))
        self.write({'state': 'cancelled'})

    def _create_pos_order(self):
        self.ensure_one()
        session = self._get_active_session()
        if not session:
            return False
        order_vals = {
            'session_id': session.id,
            'table_id': self.table_id.id,
            'customer_id': self.customer_id.id if self.customer_id else False,
            'state': 'confirmed',
            'note': self.note or '',
            'ordered_at': fields.Datetime.now(),
        }
        pos_order = self.env['odfe.pos.order'].create(order_vals)
        for line in self.line_ids:
            self.env['odfe.pos.order.line'].create({
                'order_id': pos_order.id,
                'product_id': line.product_id.id,
                'quantity': line.quantity,
                'price_unit': line.price_unit,
                'note': line.note or '',
            })
        if self.table_id:
            self.table_id.set_occupied()
        return pos_order

    def _get_active_session(self):
        return self.env['odfe.pos.session'].search([
            ('state', '=', 'opened'),
        ], limit=1, order='id desc')

    def _notify_kitchen(self):
        self.ensure_one()
        bus = self.env['odfe.bus.message']
        if bus and hasattr(bus, 'send'):
            bus.send(
                channel='kitchen',
                message_type='new_order',
                payload={
                    'order_id': self.id,
                    'order_ref': self.name,
                    'table_name': self.table_id.name if self.table_id else '',
                    'customer': self.customer_id.name if self.customer_id else '',
                    'items': [{
                        'product': l.product_name or l.product_id.display_name,
                        'qty': l.quantity,
                        'price': l.price_unit,
                        'note': l.note,
                    } for l in self.line_ids],
                }
            )

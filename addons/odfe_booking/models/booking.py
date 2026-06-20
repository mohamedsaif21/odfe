from odoo import api, fields, models, _
from odoo.exceptions import ValidationError, UserError
from datetime import datetime, timedelta


class OdpeBooking(models.Model):
    _name = 'odfe.booking'
    _description = 'Restaurant Booking'
    _order = 'date DESC, time_start DESC'
    _rec_name = 'name'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    name = fields.Char(string='Booking Reference', required=True, copy=False, readonly=True,
                       default=lambda self: _('New'))
    customer_id = fields.Many2one('odfe.customer', string='Customer', required=True, tracking=True,
                                  domain="[('active', 'in', (True, False))]")
    phone = fields.Char(string='Phone', tracking=True)
    email = fields.Char(string='Email')
    guest_count = fields.Integer(string='Guests', required=True, tracking=True)
    table_id = fields.Many2one('odfe.table', string='Table', required=True, tracking=True,
                               domain="[('floor_id', '=?', floor_id), ('active', '=', True)]")
    floor_id = fields.Many2one('odfe.floor', string='Floor', related='table_id.floor_id',
                               store=True, readonly=True)
    date = fields.Date(string='Date', required=True, tracking=True,
                       default=fields.Date.context_today)
    time_start = fields.Float(string='Start Time', required=True, tracking=True,
                              help='Start time in hours (e.g., 19.5 = 7:30 PM)')
    time_end = fields.Float(string='End Time', compute='_compute_time_end', store=True, readonly=False,
                            tracking=True, help='End time in hours')
    duration = fields.Float(string='Duration (hours)', compute='_compute_duration', store=True)
    state = fields.Selection([
        ('draft', 'Draft'),
        ('confirmed', 'Confirmed'),
        ('seated', 'Seated'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
    ], string='Status', default='draft', required=True, tracking=True)
    note = fields.Text(string='Notes')
    created_by = fields.Many2one('res.users', string='Created By', default=lambda self: self.env.user,
                                 readonly=True)
    confirmed_at = fields.Datetime(string='Confirmed At', readonly=True, copy=False)
    cancelled_at = fields.Datetime(string='Cancelled At', readonly=True, copy=False)
    cancellation_reason = fields.Char(string='Cancellation Reason')
    reservation_ids = fields.One2many('odfe.reservation', 'booking_id',
                                      string='Reservation Items')

    _sql_constraints = [
        ('check_guest_count_positive', 'CHECK(guest_count > 0)',
         'Number of guests must be greater than zero!'),
        ('check_guest_count_max', 'CHECK(guest_count <= 100)',
         'Number of guests cannot exceed 100!'),
        ('check_time_start_range', 'CHECK(time_start >= 0 AND time_start <= 24)',
         'Start time must be between 0 and 24!'),
    ]

    @api.depends('time_start')
    def _compute_time_end(self):
        for rec in self:
            if not rec.time_end and rec.time_start:
                rec.time_end = rec.time_start + 2.0

    @api.depends('time_start', 'time_end')
    def _compute_duration(self):
        for rec in self:
            if rec.time_start and rec.time_end:
                rec.duration = rec.time_end - rec.time_start
            else:
                rec.duration = 0.0

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', _('New')) == _('New'):
                seq_date = None
                if vals.get('date'):
                    seq_date = fields.Date.to_date(vals['date'])
                vals['name'] = self.env['ir.sequence'].next_by_code(
                    'odfe.booking', sequence_date=seq_date) or _('New')
            if not vals.get('phone') and vals.get('customer_id'):
                customer = self.env['odfe.customer'].browse(vals['customer_id'])
                if customer.phone:
                    vals['phone'] = customer.phone
            if not vals.get('email') and vals.get('customer_id'):
                customer = self.env['odfe.customer'].browse(vals['customer_id'])
                if customer.email:
                    vals['email'] = customer.email
        return super().create(vals_list)

    @api.constrains('table_id', 'date', 'time_start', 'time_end')
    def _check_double_booking(self):
        for rec in self:
            if not rec.table_id or not rec.date or not rec.time_start:
                return
            end_time = rec.time_end or rec.time_start + 2.0
            domain = [
                ('table_id', '=', rec.table_id.id),
                ('date', '=', rec.date),
                ('state', 'not in', ('cancelled', 'no_show')),
                ('id', '!=', rec.id),
            ]
            overlapping = self.search(domain).filtered(
                lambda b: b._times_overlap(rec.time_start, end_time)
            )
            if overlapping:
                table_name = rec.table_id.name
                raise ValidationError(_(
                    'The table %(table)s is already booked for this time slot.\n'
                    'Existing booking: %(booking)s (%(time_start).1f - %(time_end).1f)',
                    table=table_name,
                    booking=overlapping[0].name,
                    time_start=overlapping[0].time_start,
                    time_end=overlapping[0].time_end or overlapping[0].time_start + 2.0,
                ))

    @api.constrains('table_id', 'guest_count')
    def _check_table_capacity(self):
        for rec in self:
            if rec.table_id and rec.guest_count and rec.guest_count > rec.table_id.capacity:
                raise ValidationError(_(
                    'Table %(table)s has a capacity of %(cap)d but you are booking for %(guests)d guests.',
                    table=rec.table_id.name, cap=rec.table_id.capacity, guests=rec.guest_count,
                ))

    @api.onchange('customer_id')
    def _onchange_customer_id(self):
        if self.customer_id:
            self.phone = self.customer_id.phone
            self.email = self.customer_id.email

    @api.onchange('table_id')
    def _onchange_table_id(self):
        if self.table_id:
            self.floor_id = self.table_id.floor_id

    def _times_overlap(self, start_a, end_a):
        self.ensure_one()
        end_b = self.time_end or self.time_start + 2.0
        return start_a < end_b and self.time_start < end_a

    def action_confirm(self):
        for rec in self:
            if rec.state != 'draft':
                raise UserError(_('Only draft bookings can be confirmed.'))
            rec.write({
                'state': 'confirmed',
                'confirmed_at': fields.Datetime.now(),
            })
            rec.table_id.set_reserved()

    def action_seat(self):
        for rec in self:
            if rec.state != 'confirmed':
                raise UserError(_('Only confirmed bookings can be marked as seated.'))
            rec.write({'state': 'seated'})
            rec.table_id.set_occupied()

    def cancel(self, reason=None):
        for rec in self:
            if rec.state not in ('draft', 'confirmed'):
                raise UserError(_('Only draft or confirmed bookings can be cancelled.'))
            rec.write({
                'state': 'cancelled',
                'cancelled_at': fields.Datetime.now(),
                'cancellation_reason': reason,
            })

    def action_cancel(self):
        return {
            'type': 'ir.actions.act_window',
            'name': _('Cancel Booking'),
            'res_model': 'booking.cancel.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {'default_booking_id': self.id},
        }

    def action_mark_no_show(self):
        for rec in self:
            if rec.state not in ('draft', 'confirmed'):
                raise UserError(_('Only draft or confirmed bookings can be marked as no-show.'))
            rec.write({'state': 'no_show'})

    def action_draft(self):
        for rec in self:
            if rec.state not in ('cancelled', 'no_show'):
                raise UserError(_('Only cancelled or no-show bookings can be reset to draft.'))
            rec.write({'state': 'draft', 'cancellation_reason': False})

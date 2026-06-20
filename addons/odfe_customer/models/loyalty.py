from odoo import api, fields, models, _
from odoo.exceptions import UserError, ValidationError


class OdpeLoyaltyProgram(models.Model):
    _name = 'odfe.loyalty.program'
    _description = 'Loyalty Program'
    _rec_name = 'name'
    _order = 'sequence, name'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    name = fields.Char(string='Program Name', required=True, translate=True, tracking=True)
    active = fields.Boolean(default=True)
    sequence = fields.Integer(default=10)
    program_type = fields.Selection(
        [('points', 'Points per Currency'), ('visits', 'Points per Visit'), ('spend', 'Spend-Based')],
        string='Type',
        required=True,
        default='points',
        tracking=True,
    )
    points_per_currency = fields.Float(string='Points per Currency', default=1.0, help='Points earned per unit of currency spent.')
    points_per_visit = fields.Integer(string='Points per Visit', default=10, help='Points earned per visit.')
    min_spend = fields.Monetary(string='Minimum Spend', currency_field='currency_id', help='Minimum spend to qualify.')
    reward_type = fields.Selection(
        [('discount', 'Discount'), ('free_item', 'Free Item')],
        string='Reward Type',
        required=True,
        default='discount',
    )
    reward_value = fields.Float(string='Reward Value', default=0.0, help='Discount percentage or fixed amount.')
    start_date = fields.Date(string='Start Date')
    end_date = fields.Date(string='End Date')
    company_id = fields.Many2one(
        'res.company',
        string='Company',
        default=lambda self: self.env.company,
    )
    currency_id = fields.Many2one(
        'res.currency',
        related='company_id.currency_id',
        readonly=True,
    )
    customer_loyalty_ids = fields.One2many(
        'odfe.customer.loyalty',
        'program_id',
        string='Customer Enrollments',
    )
    member_count = fields.Integer(string='Members', compute='_compute_member_count')
    active_member_count = fields.Integer(string='Active Members', compute='_compute_member_count')

    @api.depends('customer_loyalty_ids')
    def _compute_member_count(self):
        for record in self:
            members = record.customer_loyalty_ids
            record.member_count = len(members)
            record.active_member_count = len(members.filtered(lambda m: m.active))

    @api.constrains('start_date', 'end_date')
    def _check_dates(self):
        for record in self:
            if record.start_date and record.end_date and record.start_date > record.end_date:
                raise ValidationError(_('Start date must be before end date.'))

    @api.constrains('program_type', 'points_per_currency', 'points_per_visit')
    def _check_points_config(self):
        for record in self:
            if record.program_type == 'points' and record.points_per_currency <= 0:
                raise ValidationError(_('Points per currency must be greater than zero.'))
            if record.program_type == 'visits' and record.points_per_visit <= 0:
                raise ValidationError(_('Points per visit must be greater than zero.'))

    def action_activate(self):
        self.write({'active': True})

    def action_archive(self):
        self.write({'active': False})


class OdpeCustomerLoyalty(models.Model):
    _name = 'odfe.customer.loyalty'
    _description = 'Customer Loyalty Enrollment'
    _rec_name = 'customer_id'
    _order = 'enrolled_date desc, id'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    TIER_THRESHOLDS = [
        ('bronze', 'Bronze', 0),
        ('silver', 'Silver', 500),
        ('gold', 'Gold', 2000),
        ('platinum', 'Platinum', 5000),
    ]

    customer_id = fields.Many2one(
        'odfe.customer',
        string='Customer',
        required=True,
        ondelete='cascade',
        tracking=True,
    )
    program_id = fields.Many2one(
        'odfe.loyalty.program',
        string='Loyalty Program',
        required=True,
        ondelete='cascade',
        tracking=True,
    )
    active = fields.Boolean(default=True)
    points_earned = fields.Float(string='Points Earned', default=0.0, required=True)
    points_redeemed = fields.Float(string='Points Redeemed', default=0.0, required=True)
    points_balance = fields.Float(
        string='Points Balance',
        compute='_compute_points_balance',
        store=True,
    )
    tier = fields.Selection(
        [(t[0], t[1]) for t in TIER_THRESHOLDS],
        string='Tier',
        compute='_compute_tier',
        store=True,
        tracking=True,
        default='bronze',
    )
    enrolled_date = fields.Datetime(string='Enrolled Date', default=fields.Datetime.now, required=True)
    last_activity = fields.Datetime(string='Last Activity', default=fields.Datetime.now)
    notes = fields.Text(string='Notes')
    company_id = fields.Many2one(
        'res.company',
        string='Company',
        default=lambda self: self.env.company,
        related='customer_id.company_id',
        readonly=True,
    )
    currency_id = fields.Many2one(
        'res.currency',
        related='company_id.currency_id',
        readonly=True,
    )

    _sql_constraints = [
        (
            'customer_program_unique',
            'UNIQUE(customer_id, program_id)',
            'A customer can only be enrolled once in each loyalty program.',
        ),
    ]

    @api.depends('points_earned', 'points_redeemed')
    def _compute_points_balance(self):
        for record in self:
            record.points_balance = record.points_earned - record.points_redeemed

    @api.depends('customer_id.total_spent')
    def _compute_tier(self):
        for record in self:
            total = record.customer_id.total_spent or 0.0
            tier = 'bronze'
            for key, _, threshold in self.TIER_THRESHOLDS:
                if total >= threshold:
                    tier = key
            record.tier = tier

    @api.constrains('points_redeemed')
    def _check_redeemed(self):
        for record in self:
            if record.points_redeemed < 0:
                raise ValidationError(_('Points redeemed cannot be negative.'))
            if record.points_redeemed > record.points_earned:
                raise ValidationError(_('Points redeemed cannot exceed points earned.'))

    def earn_points(self, order_id):
        self.ensure_one()
        order = self.env['pos.order'].sudo().browse(order_id)
        if not order.exists():
            raise UserError(_('Order not found.'))

        program = self.program_id
        points = 0.0

        if program.program_type == 'points':
            points = order.amount_total * program.points_per_currency
        elif program.program_type == 'visits':
            points = program.points_per_visit
        elif program.program_type == 'spend':
            if order.amount_total >= program.min_spend:
                points = order.amount_total * (program.points_per_currency or 1.0)

        if points:
            self.points_earned += points
            self.last_activity = fields.Datetime.now()

        return points

    def redeem_points(self, points_amount):
        self.ensure_one()
        if points_amount <= 0:
            raise UserError(_('Points amount must be positive.'))

        available = self.points_earned - self.points_redeemed
        if points_amount > available:
            raise UserError(_(
                'Insufficient points. You have %(available).2f points available but requested %(requested).2f.',
                available=available,
                requested=points_amount,
            ))

        self.points_redeemed += points_amount
        self.last_activity = fields.Datetime.now()

        return True

    def name_get(self):
        result = []
        for record in self:
            name = f'{record.customer_id.name} - {record.program_id.name}'
            result.append((record.id, name))
        return result

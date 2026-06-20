from odoo import api, fields, models, _
from odoo.exceptions import ValidationError


class OdfeCustomerTag(models.Model):
    _name = 'odfe.customer.tag'
    _description = 'Customer Tag'
    _order = 'name'

    name = fields.Char(string='Tag Name', required=True, translate=True)
    color = fields.Integer(string='Color Index')
    active = fields.Boolean(default=True)


class OdfeCustomer(models.Model):
    _name = 'odfe.customer'
    _description = 'ODFE Customer'
    _rec_name = 'name'
    _order = 'name'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    name = fields.Char(string='Customer Name', required=True, tracking=True)
    phone = fields.Char(string='Phone', tracking=True)
    email = fields.Char(string='Email', tracking=True)
    image = fields.Image(string='Photo', max_width=1920, max_height=1920)
    address = fields.Char(string='Address')
    city = fields.Char(string='City')
    state_id = fields.Many2one('res.country.state', string='State', domain="[('country_id', '=?', country_id)]")
    country_id = fields.Many2one('res.country', string='Country')
    zip = fields.Char(string='ZIP')
    total_spent = fields.Monetary(
        string='Total Spent',
        currency_field='currency_id',
        compute='_compute_order_stats',
        store=True,
    )
    visit_count = fields.Integer(
        string='Visit Count',
        compute='_compute_order_stats',
        store=True,
    )
    last_visit = fields.Datetime(
        string='Last Visit',
        compute='_compute_order_stats',
        store=True,
    )
    tags = fields.Many2many('odfe.customer.tag', string='Tags')
    notes = fields.Text(string='Notes')
    active = fields.Boolean(default=True)
    partner_id = fields.Many2one(
        'res.partner',
        string='Linked Partner',
        ondelete='restrict',
        help='Linked Odoo partner used for POS order tracking.',
    )
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
    loyalty_ids = fields.One2many('odfe.customer.loyalty', 'customer_id', string='Loyalty Enrollments')
    tier = fields.Selection(
        [('bronze', 'Bronze'), ('silver', 'Silver'), ('gold', 'Gold'), ('platinum', 'Platinum')],
        string='Tier',
        compute='_compute_tier',
        store=True,
        default='bronze',
    )

    _sql_constraints = [
        ('phone_unique', 'UNIQUE(phone)', 'A customer with this phone number already exists.'),
    ]

    @api.depends('loyalty_ids.tier')
    def _compute_tier(self):
        tier_order = {'bronze': 0, 'silver': 1, 'gold': 2, 'platinum': 3}
        for record in self:
            highest = 'bronze'
            for loyalty in record.loyalty_ids:
                if tier_order.get(loyalty.tier, -1) > tier_order.get(highest, -1):
                    highest = loyalty.tier
            record.tier = highest

    @api.depends('partner_id')
    def _compute_order_stats(self):
        Order = self.env['pos.order'].sudo()
        for record in self:
            if record.partner_id:
                orders = Order.search([('partner_id', '=', record.partner_id.id)])
                record.visit_count = len(orders)
                record.total_spent = sum(orders.mapped('amount_total'))
                record.last_visit = orders and max(orders.mapped('date_order')) or False
            else:
                record.visit_count = 0
                record.total_spent = 0.0
                record.last_visit = False

    def name_get(self):
        result = []
        for record in self:
            name = record.name
            if record.phone:
                name = f'{name} ({record.phone})'
            result.append((record.id, name))
        return result

    @api.model
    def _name_search(self, name, domain=None, operator='ilike', limit=None, order=None):
        domain = domain or []
        if name:
            domain = [
                '|',
                ('name', operator, name),
                ('phone', operator, name),
            ] + domain
        return self._search(domain, limit=limit, order=order)

    @api.constrains('phone')
    def _check_phone_format(self):
        for record in self:
            if record.phone and not record.phone.replace('+', '').replace('-', '').replace(' ', '').isdigit():
                raise ValidationError(_('Phone number must contain only digits, spaces, +, and -.'))

    def action_view_orders(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': _('POS Orders'),
            'res_model': 'pos.order',
            'view_mode': 'tree,form',
            'domain': [('partner_id', '=', self.partner_id.id)],
            'context': {'default_partner_id': self.partner_id.id},
        }

    def action_enroll_loyalty(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': _('Enroll in Loyalty Program'),
            'res_model': 'odfe.customer.loyalty',
            'view_mode': 'form',
            'context': {'default_customer_id': self.id},
        }

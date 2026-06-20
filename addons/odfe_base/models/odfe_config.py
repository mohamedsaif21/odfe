from odoo import models, fields


class OdfeConfig(models.Model):
    _name = 'odfe.config'
    _description = 'ODFE Configuration'
    _rec_name = 'restaurant_name'

    restaurant_name = fields.Char(string='Restaurant Name', default='My Restaurant')
    restaurant_address = fields.Char(string='Address')
    restaurant_phone = fields.Char(string='Phone')
    restaurant_email = fields.Char(string='Email')
    currency_id = fields.Many2one('res.currency', default=lambda self: self.env.company.currency_id)
    tax_included = fields.Boolean(string='Tax Included in Price', default=False)
    default_pos_id = fields.Many2one('odfe.pos.config', string='Default POS Configuration')
    print_receipt_auto = fields.Boolean(string='Auto Print Receipt', default=True)
    send_email_receipt = fields.Boolean(string='Send Email Receipt', default=False)
    enable_kds = fields.Boolean(string='Enable Kitchen Display', default=True)
    enable_self_order = fields.Boolean(string='Enable Self Ordering', default=False)
    enable_customer_display = fields.Boolean(string='Enable Customer Display', default=False)
    enable_loyalty = fields.Boolean(string='Enable Loyalty Program', default=False)
    service_charge_percent = fields.Float(string='Service Charge %', default=0.0)
    service_charge_account_id = fields.Many2one('account.account', string='Service Charge Account')
    discount_limit = fields.Float(string='Maximum Discount %', default=50.0)

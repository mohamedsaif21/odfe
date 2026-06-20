from odoo import api, fields, models


class OdfeSchedule(models.Model):
    _name = 'odfe.schedule'
    _description = 'Schedule Configuration'
    _order = 'day_of_week, time_start'
    _rec_name = 'name'

    name = fields.Char(string='Schedule Name', required=True)
    day_of_week = fields.Selection([
        ('0', 'Monday'),
        ('1', 'Tuesday'),
        ('2', 'Wednesday'),
        ('3', 'Thursday'),
        ('4', 'Friday'),
        ('5', 'Saturday'),
        ('6', 'Sunday'),
    ], string='Day of Week', required=True)
    time_start = fields.Float(string='Start Time', required=True,
                              help='Start time in hours (e.g., 9.0 = 9:00 AM)')
    time_end = fields.Float(string='End Time', required=True,
                            help='End time in hours (e.g., 17.0 = 5:00 PM)')
    max_guests = fields.Integer(string='Max Guests', default=0,
                                help='0 = unlimited')
    max_tables = fields.Integer(string='Max Tables', default=0,
                                help='Maximum number of tables that can be booked in this slot. 0 = unlimited')

    _sql_constraints = [
        ('check_time_range', 'CHECK(time_start >= 0 AND time_start < 24 AND time_end > 0 AND time_end <= 24)',
         'Times must be between 0 and 24!'),
        ('check_time_order', 'CHECK(time_end > time_start)',
         'End time must be after start time!'),
    ]

from odoo import api, fields, models


class OdfeReservation(models.Model):
    _name = 'odfe.reservation'
    _description = 'Reservation Item'
    _order = 'booking_id, sequence, id'
    _rec_name = 'item'

    booking_id = fields.Many2one('odfe.booking', string='Booking', required=True,
                                 ondelete='cascade')
    sequence = fields.Integer(string='Sequence', default=10)
    item = fields.Char(string='Item', required=True)
    quantity = fields.Float(string='Quantity', default=1.0, required=True)
    notes = fields.Text(string='Notes')

from odoo import api, fields, models, _


class OdfeBookingCancelWizard(models.TransientModel):
    _name = 'odfe.booking.cancel.wizard'
    _description = 'Booking Cancellation Wizard'

    booking_id = fields.Many2one('odfe.booking', string='Booking', required=True)
    cancellation_reason = fields.Char(string='Cancellation Reason', required=True)

    def action_confirm_cancel(self):
        self.booking_id.cancel(self.cancellation_reason)
        return {'type': 'ir.actions.act_window_close'}

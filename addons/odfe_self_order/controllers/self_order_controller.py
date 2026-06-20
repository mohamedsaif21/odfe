from odoo import http
from odoo.http import request
from odoo.exceptions import AccessError, MissingError
import json


class SelfOrderController(http.Controller):

    @http.route('/api/self/menu', type='json', auth='public', methods=['GET'], csrf=False)
    def get_menu(self, token=None):
        if not token:
            return {'error': 'Missing token', 'status': 400}
        table = request.env['odfe.self.order.token'].sudo().validate_token(token)
        if not table:
            return {'error': 'Invalid or expired token', 'status': 401}
        menu = request.env['odfe.self.order.menu'].sudo().search([
            ('is_active', '=', True),
        ], limit=1, order='sequence')
        if not menu:
            return {'error': 'No active menu found', 'status': 404}
        data = menu.get_menu_data()
        data['table_id'] = table.id
        data['table_name'] = table.name
        return data

    @http.route('/api/self/order/submit', type='json', auth='public', methods=['POST'], csrf=False)
    def submit_order(self, **kwargs):
        data = request.jsonrequest
        token = data.get('token')
        if not token:
            return {'error': 'Missing token', 'status': 400}
        table = request.env['odfe.self.order.token'].sudo().validate_token(token)
        if not table:
            return {'error': 'Invalid or expired token', 'status': 401}
        items = data.get('items', [])
        if not items:
            return {'error': 'Order has no items', 'status': 400}
        note = data.get('note', '')
        special_instructions = data.get('special_instructions', '')
        customer_data = data.get('customer', {})
        customer = False
        if customer_data.get('phone'):
            existing = request.env['odfe.customer'].sudo().search([
                ('phone', '=', customer_data['phone']),
            ], limit=1)
            if existing:
                customer = existing.id
            else:
                new_customer = request.env['odfe.customer'].sudo().create({
                    'name': customer_data.get('name', customer_data.get('phone', 'Guest')),
                    'phone': customer_data.get('phone', ''),
                    'email': customer_data.get('email', ''),
                })
                customer = new_customer.id
        order = request.env['odfe.self.order'].sudo().create({
            'token': token,
            'table_id': table.id,
            'customer_id': customer,
            'note': note,
            'special_instructions': special_instructions,
        })
        Product = request.env['odfe.product'].sudo()
        for item in items:
            product = Product.browse(item.get('product_id'))
            if not product.exists():
                continue
            request.env['odfe.self.order.line'].sudo().create({
                'self_order_id': order.id,
                'product_id': product.id,
                'product_name': product.name,
                'quantity': item.get('quantity', 1),
                'price_unit': product.list_price,
                'note': item.get('note', ''),
            })
        order.action_submit()
        return {
            'status': 200,
            'order_id': order.id,
            'order_ref': order.name,
            'total': order.total,
        }

    @http.route('/api/self/order/<string:token>/status', type='json', auth='public', methods=['GET'], csrf=False)
    def get_order_status(self, token):
        if not token:
            return {'error': 'Missing token', 'status': 400}
        table = request.env['odfe.self.order.token'].sudo().validate_token(token)
        if not table:
            return {'error': 'Invalid or expired token', 'status': 401}
        order = request.env['odfe.self.order'].sudo().search([
            ('token', '=', token),
        ], limit=1, order='id desc')
        if not order:
            return {'error': 'No order found', 'status': 404}
        return {
            'status': 200,
            'order_id': order.id,
            'order_ref': order.name,
            'state': order.state,
            'total': order.total,
            'subtotal': order.subtotal,
            'tax_amount': order.tax_amount,
            'items': [{
                'product': l.product_name,
                'quantity': l.quantity,
                'price': l.price_unit,
                'subtotal': l.subtotal,
            } for l in order.line_ids],
            'ordered_at': str(order.ordered_at),
        }

    @http.route('/api/self/validate-token', type='json', auth='public', methods=['POST'], csrf=False)
    def validate_token(self, **kwargs):
        data = request.jsonrequest
        token = data.get('token')
        if not token:
            return {'valid': False, 'error': 'No token provided'}
        table = request.env['odfe.self.order.token'].sudo().validate_token(token)
        if table:
            session_token = request.env['odfe.self.order.token'].sudo().generate(
                table.id,
                session_id=data.get('session_id'),
            )
            return {
                'valid': True,
                'table_id': table.id,
                'table_name': table.name,
                'session_token': session_token.token,
            }
        return {'valid': False, 'error': 'Invalid or expired token'}

    @http.route('/self-order/<string:qr_token>', type='http', auth='public', website=True)
    def self_order_page(self, qr_token):
        qr_table = request.env['odfe.self.order.qr.table'].sudo().search([
            ('qr_token', '=', qr_token),
            ('active', '=', True),
        ], limit=1)
        if not qr_table:
            return request.not_found()
        return request.render('odfe_self_order.self_order_page', {
            'qr_token': qr_token,
            'table_name': qr_table.table_id.name,
            'table_id': qr_table.table_id.id,
        })

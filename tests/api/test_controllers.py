import json
from odoo.tests import HttpCase, tagged


@tagged('odfe', 'pos', 'api')
class TestPosApi(HttpCase):

    def setUp(self):
        super().setUp()
        self.floor = self.env['odfe.floor'].create({
            'name': 'API Floor',
            'code': 'API01',
        })
        self.table = self.env['odfe.table'].create({
            'name': 'API-Table',
            'floor_id': self.floor.id,
            'capacity': 4,
        })
        category = self.env['odfe.product.category'].create({
            'name': 'API Category',
        })
        self.product_tmpl = self.env['product.template'].create({
            'name': 'API Pizza',
            'list_price': 15.99,
            'type': 'product',
            'available_in_pos': True,
        })
        self.product = self.env['odfe.product'].create({
            'product_tmpl_id': self.product_tmpl.id,
            'category_id': category.id,
        })

    def test_session_open_close_api(self):
        self.authenticate('admin', 'admin')
        response = self.url_open(
            '/api/pos/session/open',
            data=json.dumps({'start_cash': 100.0}),
            headers={'Content-Type': 'application/json'},
        )
        result = response.json()
        self.assertTrue(result.get('success'))
        session_id = result.get('session')
        self.assertIsNotNone(session_id)
        response = self.url_open(
            '/api/pos/session/close',
            data=json.dumps({'session_id': session_id, 'cash_count': 500.0}),
            headers={'Content-Type': 'application/json'},
        )
        result = response.json()
        self.assertTrue(result.get('success'))

    def test_order_create_api(self):
        self.authenticate('admin', 'admin')
        response = self.url_open(
            '/api/pos/session/open',
            data=json.dumps({'start_cash': 0.0}),
            headers={'Content-Type': 'application/json'},
        )
        session_id = response.json().get('session')
        response = self.url_open(
            '/api/pos/order/create',
            data=json.dumps({
                'session_id': session_id,
                'table_id': self.table.id,
                'lines': [{
                    'product_id': self.product.id,
                    'quantity': 2.0,
                    'price_unit': 15.99,
                }],
            }),
            headers={'Content-Type': 'application/json'},
        )
        result = response.json()
        self.assertTrue(result.get('success'))
        self.assertIsNotNone(result.get('order_id'))

    def test_order_get_api(self):
        self.authenticate('admin', 'admin')
        response = self.url_open(
            '/api/pos/session/open',
            data=json.dumps({'start_cash': 0.0}),
            headers={'Content-Type': 'application/json'},
        )
        session_id = response.json().get('session')
        response = self.url_open(
            '/api/pos/order/create',
            data=json.dumps({
                'session_id': session_id,
                'lines': [{
                    'product_id': self.product.id,
                    'quantity': 1.0,
                    'price_unit': 15.99,
                }],
            }),
            headers={'Content-Type': 'application/json'},
        )
        order_id = response.json().get('order_id')
        response = self.url_open(
            '/api/pos/order/get',
            data=json.dumps({'order_id': order_id}),
            headers={'Content-Type': 'application/json'},
        )
        result = response.json()
        self.assertTrue(result.get('success'))
        self.assertEqual(result['order']['id'], order_id)
        self.assertEqual(result['order']['state'], 'draft')

    def test_order_create_with_modifiers(self):
        self.authenticate('admin', 'admin')
        response = self.url_open(
            '/api/pos/session/open',
            data=json.dumps({'start_cash': 0.0}),
            headers={'Content-Type': 'application/json'},
        )
        session_id = response.json().get('session')
        response = self.url_open(
            '/api/pos/order/create',
            data=json.dumps({
                'session_id': session_id,
                'lines': [
                    {
                        'product_id': self.product.id,
                        'quantity': 1.0,
                        'price_unit': 15.99,
                    },
                    {
                        'product_id': self.product.id,
                        'quantity': 1.0,
                        'price_unit': 2.50,
                        'is_modifier': True,
                        'parent_product_id': self.product.id,
                    },
                ],
            }),
            headers={'Content-Type': 'application/json'},
        )
        result = response.json()
        self.assertTrue(result.get('success'))

    def test_product_search_api(self):
        self.authenticate('admin', 'admin')
        response = self.url_open(
            '/api/pos/product/search',
            data=json.dumps({'query': 'Pizza', 'page': 1, 'page_size': 20}),
            headers={'Content-Type': 'application/json'},
        )
        result = response.json()
        self.assertTrue(result.get('success'))

    def test_payment_process_api(self):
        self.authenticate('admin', 'admin')
        response = self.url_open(
            '/api/pos/session/open',
            data=json.dumps({'start_cash': 0.0}),
            headers={'Content-Type': 'application/json'},
        )
        session_id = response.json().get('session')
        response = self.url_open(
            '/api/pos/order/create',
            data=json.dumps({
                'session_id': session_id,
                'lines': [{
                    'product_id': self.product.id,
                    'quantity': 1.0,
                    'price_unit': 15.99,
                }],
            }),
            headers={'Content-Type': 'application/json'},
        )
        order_id = response.json().get('order_id')
        payment_method = self.env['odfe.payment.method'].create({
            'name': 'Cash',
            'code': 'CASH',
            'type': 'cash',
        })
        response = self.url_open(
            '/api/pos/payment/process',
            data=json.dumps({
                'order_id': order_id,
                'payments': [{
                    'method_id': payment_method.id,
                    'amount': 20.0,
                }],
            }),
            headers={'Content-Type': 'application/json'},
        )
        result = response.json()
        self.assertTrue(result.get('success'))

    def test_table_list_api(self):
        self.authenticate('admin', 'admin')
        response = self.url_open(
            '/api/pos/table/list',
            data=json.dumps({}),
            headers={'Content-Type': 'application/json'},
        )
        result = response.json()
        self.assertTrue(result.get('success'))
        self.assertIsInstance(result.get('tables'), list)

    def test_customer_search_api(self):
        self.authenticate('admin', 'admin')
        self.env['odfe.customer'].create({
            'name': 'API Customer',
            'phone': '+9999999999',
        })
        response = self.url_open(
            '/api/pos/customer/search',
            data=json.dumps({'query': 'API'}),
            headers={'Content-Type': 'application/json'},
        )
        result = response.json()
        self.assertTrue(result.get('success'))

    def test_cart_add_api(self):
        self.authenticate('admin', 'admin')
        response = self.url_open(
            '/api/pos/session/open',
            data=json.dumps({'start_cash': 0.0}),
            headers={'Content-Type': 'application/json'},
        )
        session_id = response.json().get('session')
        response = self.url_open(
            '/api/pos/cart/add',
            data=json.dumps({
                'session_id': session_id,
                'product_id': self.product.id,
                'quantity': 2.0,
            }),
            headers={'Content-Type': 'application/json'},
        )
        result = response.json()
        self.assertTrue(result.get('success'))
        self.assertIsNotNone(result.get('cart_id'))


@tagged('odfe', 'pos', 'api')
class TestPosApiErrors(HttpCase):

    def test_session_open_twice(self):
        self.authenticate('admin', 'admin')
        self.url_open(
            '/api/pos/session/open',
            data=json.dumps({'start_cash': 0.0}),
            headers={'Content-Type': 'application/json'},
        )
        response = self.url_open(
            '/api/pos/session/open',
            data=json.dumps({'start_cash': 0.0}),
            headers={'Content-Type': 'application/json'},
        )
        result = response.json()
        self.assertFalse(result.get('success'))

    def test_order_create_no_lines(self):
        self.authenticate('admin', 'admin')
        response = self.url_open(
            '/api/pos/session/open',
            data=json.dumps({'start_cash': 0.0}),
            headers={'Content-Type': 'application/json'},
        )
        session_id = response.json().get('session')
        response = self.url_open(
            '/api/pos/order/create',
            data=json.dumps({
                'session_id': session_id,
                'lines': [],
            }),
            headers={'Content-Type': 'application/json'},
        )
        result = response.json()
        self.assertFalse(result.get('success'))

    def test_order_get_not_found(self):
        self.authenticate('admin', 'admin')
        response = self.url_open(
            '/api/pos/order/get',
            data=json.dumps({'order_id': 99999}),
            headers={'Content-Type': 'application/json'},
        )
        result = response.json()
        self.assertFalse(result.get('success'))

    def test_session_close_not_owned(self):
        self.authenticate('admin', 'admin')
        response = self.url_open(
            '/api/pos/session/open',
            data=json.dumps({'start_cash': 0.0}),
            headers={'Content-Type': 'application/json'},
        )
        session_id = response.json().get('session')
        self.session = self.env['odfe.pos.session'].browse(session_id)
        self.session.write({'user_id': 99999})
        response = self.url_open(
            '/api/pos/session/close',
            data=json.dumps({'session_id': session_id, 'cash_count': 0.0}),
            headers={'Content-Type': 'application/json'},
        )
        result = response.json()
        self.assertFalse(result.get('success'))

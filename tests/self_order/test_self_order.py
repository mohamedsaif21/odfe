from odoo.tests import TransactionCase, tagged
from odoo.exceptions import UserError
from datetime import datetime, timedelta
from odoo import fields


@tagged('odfe', 'self_order', 'pos')
class TestSelfOrderToken(TransactionCase):

    def setUp(self):
        super().setUp()
        self.floor = self.env['odfe.floor'].create({
            'name': 'SO Floor',
            'code': 'SO01',
        })
        self.table = self.env['odfe.table'].create({
            'name': 'SO-Table',
            'floor_id': self.floor.id,
            'capacity': 4,
        })

    def test_token_generation(self):
        token = self.env['odfe.self.order.token'].generate(
            table_id=self.table.id,
        )
        self.assertTrue(token.token)
        self.assertEqual(token.table_id.id, self.table.id)
        self.assertTrue(token.active)

    def test_token_validation_valid(self):
        token = self.env['odfe.self.order.token'].generate(
            table_id=self.table.id,
        )
        result = self.env['odfe.self.order.token'].validate_token(token.token)
        self.assertTrue(result)
        self.assertEqual(result.id, self.table.id)

    def test_token_validation_invalid(self):
        result = self.env['odfe.self.order.token'].validate_token('nonexistent')
        self.assertFalse(result)

    def test_token_expiry(self):
        token = self.env['odfe.self.order.token'].generate(
            table_id=self.table.id,
        )
        token.write({
            'expires_at': fields.Datetime.now() - timedelta(hours=1),
        })
        result = self.env['odfe.self.order.token'].validate_token(token.token)
        self.assertFalse(result)

    def test_token_expire_action(self):
        token = self.env['odfe.self.order.token'].generate(
            table_id=self.table.id,
        )
        token.action_expire()
        self.assertFalse(token.active)

    def test_cron_expire_tokens(self):
        token = self.env['odfe.self.order.token'].generate(
            table_id=self.table.id,
        )
        token.write({
            'expires_at': fields.Datetime.now() - timedelta(hours=1),
        })
        count = self.env['odfe.self.order.token']._cron_expire_tokens()
        self.assertEqual(count, 1)
        self.assertFalse(token.active)

    def test_token_unique_constraint(self):
        token1 = self.env['odfe.self.order.token'].generate(
            table_id=self.table.id,
        )
        with self.assertRaises(Exception):
            self.env['odfe.self.order.token'].create({
                'token': token1.token,
                'table_id': self.table.id,
            })


@tagged('odfe', 'self_order', 'pos')
class TestSelfOrderQrTable(TransactionCase):

    def setUp(self):
        super().setUp()
        self.floor = self.env['odfe.floor'].create({
            'name': 'QR Floor',
            'code': 'QR01',
        })
        self.table = self.env['odfe.table'].create({
            'name': 'QR-Table',
            'floor_id': self.floor.id,
        })

    def test_qr_table_creation(self):
        qr_table = self.env['odfe.self.order.qr.table'].create({
            'table_id': self.table.id,
            'qr_token': 'test-token-123',
        })
        self.assertEqual(qr_table.table_id.id, self.table.id)
        self.assertEqual(qr_table.qr_token, 'test-token-123')
        self.assertTrue(qr_table.active)

    def test_qr_get_or_create(self):
        qr_table = self.env['odfe.self.order.qr.table'].get_or_create(
            self.table.id,
        )
        self.assertTrue(qr_table)
        self.assertEqual(qr_table.table_id.id, self.table.id)

    def test_qr_get_or_create_returns_existing(self):
        qr_table = self.env['odfe.self.order.qr.table'].get_or_create(
            self.table.id,
        )
        same = self.env['odfe.self.order.qr.table'].get_or_create(
            self.table.id,
        )
        self.assertEqual(qr_table.id, same.id)

    def test_qr_token_unique_constraint(self):
        self.env['odfe.self.order.qr.table'].create({
            'table_id': self.table.id,
            'qr_token': 'unique-token',
        })
        with self.assertRaises(Exception):
            self.env['odfe.self.order.qr.table'].create({
                'table_id': self.table.id,
                'qr_token': 'unique-token',
            })

    def test_qr_unique_per_table(self):
        self.env['odfe.self.order.qr.table'].create({
            'table_id': self.table.id,
            'qr_token': 'token-1',
        })
        with self.assertRaises(Exception):
            self.env['odfe.self.order.qr.table'].create({
                'table_id': self.table.id,
                'qr_token': 'token-2',
            })


@tagged('odfe', 'self_order', 'pos')
class TestSelfOrderMenu(TransactionCase):

    def setUp(self):
        super().setUp()
        self.category = self.env['odfe.product.category'].create({
            'name': 'SO Menu Cat',
        })
        self.product_tmpl = self.env['product.template'].create({
            'name': 'SO Menu Item',
            'list_price': 8.99,
            'type': 'product',
            'available_in_pos': True,
        })
        self.product = self.env['odfe.product'].create({
            'product_tmpl_id': self.product_tmpl.id,
            'category_id': self.category.id,
            'pos_visible': True,
        })

    def test_menu_creation(self):
        menu = self.env['odfe.self.order.menu'].create({
            'name': 'Lunch Menu',
        })
        self.assertEqual(menu.name, 'Lunch Menu')
        self.assertTrue(menu.active)

    def test_menu_with_products(self):
        menu = self.env['odfe.self.order.menu'].create({
            'name': 'Dinner Menu',
            'product_ids': [(4, self.product.id)],
        })
        self.assertIn(self.product, menu.product_ids)

    def test_menu_with_categories(self):
        menu = self.env['odfe.self.order.menu'].create({
            'name': 'Category Menu',
            'category_ids': [(4, self.category.id)],
        })
        self.assertIn(self.category, menu.category_ids)

    def test_get_menu_data(self):
        menu = self.env['odfe.self.order.menu'].create({
            'name': 'Test Menu',
            'product_ids': [(4, self.product.id)],
        })
        data = menu.get_menu_data()
        self.assertEqual(data['menu_name'], 'Test Menu')
        self.assertIn('categories', data)
        self.assertIn('currency', data)

    def test_menu_is_active_filter(self):
        menu = self.env['odfe.self.order.menu'].create({
            'name': 'Active Menu',
            'is_active': True,
        })
        self.assertTrue(menu.is_active)

    def test_menu_inactive(self):
        menu = self.env['odfe.self.order.menu'].create({
            'name': 'Inactive Menu',
            'is_active': False,
        })
        self.assertFalse(menu.is_active)


@tagged('odfe', 'self_order', 'pos')
class TestSelfOrderFlow(TransactionCase):

    def setUp(self):
        super().setUp()
        self.floor = self.env['odfe.floor'].create({
            'name': 'Flow Floor',
            'code': 'FLW01',
        })
        self.table = self.env['odfe.table'].create({
            'name': 'Flow-Table',
            'floor_id': self.floor.id,
        })
        self.product_tmpl = self.env['product.template'].create({
            'name': 'Flow Product',
            'list_price': 12.50,
            'type': 'product',
        })
        self.product = self.env['odfe.product'].create({
            'product_tmpl_id': self.product_tmpl.id,
        })
        self.token = self.env['odfe.self.order.token'].generate(
            table_id=self.table.id,
        )
        self.session = self.env['odfe.pos.session'].create({
            'user_id': self.env.user.id,
        })
        self.session.action_open()

    def test_self_order_creation(self):
        order = self.env['odfe.self.order'].create({
            'token': self.token.token,
            'table_id': self.table.id,
        })
        self.assertTrue(order.name)
        self.assertEqual(order.state, 'draft')
        self.assertEqual(order.table_id.id, self.table.id)

    def test_self_order_line_creation(self):
        order = self.env['odfe.self.order'].create({
            'token': self.token.token,
            'table_id': self.table.id,
        })
        line = self.env['odfe.self.order.line'].create({
            'self_order_id': order.id,
            'product_id': self.product.id,
            'quantity': 2.0,
            'price_unit': 12.50,
        })
        self.assertEqual(line.product_name, 'Flow Product')
        self.assertEqual(line.price_subtotal, 25.0)

    def test_self_order_submit_flow(self):
        order = self.env['odfe.self.order'].create({
            'token': self.token.token,
            'table_id': self.table.id,
        })
        self.env['odfe.self.order.line'].create({
            'self_order_id': order.id,
            'product_id': self.product.id,
            'quantity': 1.0,
            'price_unit': 12.50,
        })
        order.action_submit()
        self.assertEqual(order.state, 'confirmed')
        self.assertIsNotNone(order.submitted_at)

    def test_self_order_submit_empty_fails(self):
        order = self.env['odfe.self.order'].create({
            'token': self.token.token,
            'table_id': self.table.id,
        })
        with self.assertRaises(UserError):
            order.action_submit()

    def test_self_order_state_progression(self):
        order = self.env['odfe.self.order'].create({
            'token': self.token.token,
            'table_id': self.table.id,
        })
        self.env['odfe.self.order.line'].create({
            'self_order_id': order.id,
            'product_id': self.product.id,
            'quantity': 1.0,
            'price_unit': 12.50,
        })
        order.action_submit()
        order.action_preparing()
        self.assertEqual(order.state, 'preparing')
        order.action_ready()
        self.assertEqual(order.state, 'ready')

    def test_self_order_delivered(self):
        order = self.env['odfe.self.order'].create({
            'token': self.token.token,
            'table_id': self.table.id,
        })
        self.env['odfe.self.order.line'].create({
            'self_order_id': order.id,
            'product_id': self.product.id,
            'quantity': 1.0,
            'price_unit': 12.50,
        })
        order.action_submit()
        order.action_preparing()
        order.action_ready()
        order.action_delivered()
        self.assertEqual(order.state, 'delivered')

    def test_self_order_cancel(self):
        order = self.env['odfe.self.order'].create({
            'token': self.token.token,
            'table_id': self.table.id,
        })
        order.action_cancel()
        self.assertEqual(order.state, 'cancelled')
        with self.assertRaises(UserError):
            order.action_cancel()

    def test_self_order_creates_pos_order_on_submit(self):
        order = self.env['odfe.self.order'].create({
            'token': self.token.token,
            'table_id': self.table.id,
        })
        self.env['odfe.self.order.line'].create({
            'self_order_id': order.id,
            'product_id': self.product.id,
            'quantity': 1.0,
            'price_unit': 12.50,
        })
        order.action_submit()
        self.assertTrue(order.pos_order_id)
        self.assertEqual(order.pos_order_id.state, 'confirmed')

    def test_self_order_total_computation(self):
        order = self.env['odfe.self.order'].create({
            'token': self.token.token,
            'table_id': self.table.id,
        })
        self.env['odfe.self.order.line'].create({
            'self_order_id': order.id,
            'product_id': self.product.id,
            'quantity': 3.0,
            'price_unit': 10.0,
        })
        self.assertEqual(order.subtotal, 30.0)
        self.assertEqual(order.total, 30.0)

    def test_self_order_line_quantity_constraint(self):
        order = self.env['odfe.self.order'].create({
            'token': self.token.token,
            'table_id': self.table.id,
        })
        with self.assertRaises(UserError):
            self.env['odfe.self.order.line'].create({
                'self_order_id': order.id,
                'product_id': self.product.id,
                'quantity': -1.0,
                'price_unit': 10.0,
            })

    def test_self_order_table_occupied_after_submit(self):
        self.assertEqual(self.table.state, 'free')
        order = self.env['odfe.self.order'].create({
            'token': self.token.token,
            'table_id': self.table.id,
        })
        self.env['odfe.self.order.line'].create({
            'self_order_id': order.id,
            'product_id': self.product.id,
            'quantity': 1.0,
            'price_unit': 10.0,
        })
        order.action_submit()
        self.assertEqual(self.table.state, 'occupied')

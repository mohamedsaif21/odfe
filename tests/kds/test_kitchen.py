from odoo.tests import TransactionCase, tagged
from odoo.exceptions import UserError


@tagged('odfe', 'kds', 'kitchen')
class TestKitchenOrder(TransactionCase):

    def setUp(self):
        super().setUp()
        self.floor = self.env['odfe.floor'].create({
            'name': 'KDS Floor',
            'code': 'KDS01',
        })
        self.table = self.env['odfe.table'].create({
            'name': 'KDS-Table',
            'floor_id': self.floor.id,
        })
        self.product_tmpl = self.env['product.template'].create({
            'name': 'KDS Burger',
            'list_price': 10.99,
            'type': 'product',
        })
        self.product = self.env['odfe.product'].create({
            'product_tmpl_id': self.product_tmpl.id,
        })
        self.session = self.env['odfe.pos.session'].create({
            'user_id': self.env.user.id,
        })
        self.session.action_open()
        self.order = self.env['odfe.pos.order'].create({
            'session_id': self.session.id,
            'table_id': self.table.id,
        })
        self.line = self.env['odfe.pos.order.line'].create({
            'order_id': self.order.id,
            'product_id': self.product.id,
            'quantity': 2.0,
            'price_unit': 10.99,
        })
        self.order.action_confirm()

    def test_kitchen_order_creation_from_pos(self):
        kitchen_order = self.env['odfe.kitchen.order'].create_from_pos_order(self.order)
        self.assertTrue(kitchen_order)
        self.assertEqual(kitchen_order.pos_order_id.id, self.order.id)
        self.assertEqual(kitchen_order.table_name, 'KDS-Table')
        self.assertEqual(kitchen_order.state, 'pending')
        self.assertEqual(len(kitchen_order.item_ids), 1)

    def test_kitchen_order_duplicate_prevention(self):
        first = self.env['odfe.kitchen.order'].create_from_pos_order(self.order)
        second = self.env['odfe.kitchen.order'].create_from_pos_order(self.order)
        self.assertEqual(first.id, second.id)

    def test_kitchen_item_creation(self):
        kitchen_order = self.env['odfe.kitchen.order'].create_from_pos_order(self.order)
        item = kitchen_order.item_ids[0]
        self.assertEqual(item.product_name, 'KDS Burger')
        self.assertEqual(item.quantity, 2.0)
        self.assertEqual(item.state, 'pending')

    def test_kitchen_order_accept_transition(self):
        kitchen_order = self.env['odfe.kitchen.order'].create_from_pos_order(self.order)
        kitchen_order.action_accept()
        self.assertEqual(kitchen_order.state, 'accepted')
        self.assertIsNotNone(kitchen_order.started_at)
        for item in kitchen_order.item_ids:
            self.assertEqual(item.state, 'accepted')

    def test_kitchen_order_prepare_transition(self):
        kitchen_order = self.env['odfe.kitchen.order'].create_from_pos_order(self.order)
        kitchen_order.action_accept()
        kitchen_order.action_start_preparing()
        self.assertEqual(kitchen_order.state, 'preparing')
        for item in kitchen_order.item_ids:
            self.assertEqual(item.state, 'preparing')

    def test_kitchen_order_complete_transition(self):
        kitchen_order = self.env['odfe.kitchen.order'].create_from_pos_order(self.order)
        kitchen_order.action_accept()
        kitchen_order.action_start_preparing()
        kitchen_order.action_complete()
        self.assertEqual(kitchen_order.state, 'completed')
        self.assertIsNotNone(kitchen_order.completed_at)
        for item in kitchen_order.item_ids:
            self.assertEqual(item.state, 'completed')

    def test_kitchen_order_item_state_transitions(self):
        kitchen_order = self.env['odfe.kitchen.order'].create_from_pos_order(self.order)
        item = kitchen_order.item_ids[0]
        item.action_accept()
        self.assertEqual(item.state, 'accepted')
        item.action_start()
        self.assertEqual(item.state, 'preparing')
        self.assertIsNotNone(item.started_at)
        item.action_complete()
        self.assertEqual(item.state, 'completed')
        self.assertIsNotNone(item.completed_at)

    def test_kitchen_order_cancel(self):
        kitchen_order = self.env['odfe.kitchen.order'].create_from_pos_order(self.order)
        kitchen_order.action_cancel(reason='Out of stock')
        self.assertEqual(kitchen_order.state, 'cancelled')
        self.assertEqual(kitchen_order.note, 'Out of stock')

    def test_kitchen_order_double_accept_fails(self):
        kitchen_order = self.env['odfe.kitchen.order'].create_from_pos_order(self.order)
        kitchen_order.action_accept()
        with self.assertRaises(UserError):
            kitchen_order.action_accept()

    def test_kitchen_order_double_complete_fails(self):
        kitchen_order = self.env['odfe.kitchen.order'].create_from_pos_order(self.order)
        kitchen_order.action_accept()
        kitchen_order.action_start_preparing()
        kitchen_order.action_complete()
        with self.assertRaises(UserError):
            kitchen_order.action_complete()

    def test_kitchen_order_all_completed_flag(self):
        kitchen_order = self.env['odfe.kitchen.order'].create_from_pos_order(self.order)
        self.assertFalse(kitchen_order.all_completed)
        kitchen_order.action_accept()
        kitchen_order.action_start_preparing()
        kitchen_order.action_complete()
        self.assertTrue(kitchen_order.all_completed)
        self.assertEqual(kitchen_order.total_items, 1)
        self.assertEqual(kitchen_order.completed_items, 1)

    def test_kitchen_status_history(self):
        kitchen_order = self.env['odfe.kitchen.order'].create_from_pos_order(self.order)
        kitchen_order.action_accept()
        status_log = self.env['odfe.kitchen.status'].search([
            ('kitchen_order_id', '=', kitchen_order.id),
        ])
        self.assertEqual(len(status_log), 2)
        self.assertEqual(status_log[0].state_to, 'pending')
        self.assertEqual(status_log[1].state_to, 'accepted')

    def test_kitchen_order_with_modifiers(self):
        main_line = self.line
        self.env['odfe.pos.order.line'].create({
            'order_id': self.order.id,
            'product_id': self.product.id,
            'quantity': 1.0,
            'price_unit': 1.50,
            'is_modifier': True,
            'parent_line_id': main_line.id,
        })
        kitchen_order = self.env['odfe.kitchen.order'].create_from_pos_order(self.order)
        item = kitchen_order.item_ids[0]
        self.assertIn('quantity', item.modifiers)

    def test_kitchen_order_priority_from_note(self):
        order_with_note = self.env['odfe.pos.order'].create({
            'session_id': self.session.id,
            'note': 'Rush order',
        })
        self.env['odfe.pos.order.line'].create({
            'order_id': order_with_note.id,
            'product_id': self.product.id,
            'quantity': 1.0,
            'price_unit': 5.0,
        })
        kitchen_order = self.env['odfe.kitchen.order'].create_from_pos_order(order_with_note)
        self.assertEqual(kitchen_order.priority, 'urgent')

    def test_kitchen_order_normal_priority(self):
        kitchen_order = self.env['odfe.kitchen.order'].create_from_pos_order(self.order)
        self.assertEqual(kitchen_order.priority, 'normal')

    def test_kitchen_item_cancel(self):
        kitchen_order = self.env['odfe.kitchen.order'].create_from_pos_order(self.order)
        item = kitchen_order.item_ids[0]
        item.action_cancel()
        self.assertEqual(item.state, 'cancelled')
        item.action_cancel()
        self.assertEqual(item.state, 'cancelled')

    def test_kitchen_item_cancelled_then_complete(self):
        kitchen_order = self.env['odfe.kitchen.order'].create_from_pos_order(self.order)
        item = kitchen_order.item_ids[0]
        item.action_cancel()
        item.action_complete()
        self.assertEqual(item.state, 'cancelled')

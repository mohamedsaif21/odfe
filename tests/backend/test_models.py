from odoo.tests import TransactionCase, tagged
from odoo.exceptions import ValidationError, UserError
from datetime import datetime, timedelta


@tagged('odfe', 'pos', 'models')
class TestProduct(TransactionCase):

    def setUp(self):
        super().setUp()
        self.category = self.env['odfe.product.category'].create({
            'name': 'Beverages',
            'sequence': 1,
        })
        self.product_tmpl = self.env['product.template'].create({
            'name': 'Test Cola',
            'list_price': 2.50,
            'type': 'product',
        })
        self.product = self.env['odfe.product'].create({
            'product_tmpl_id': self.product_tmpl.id,
            'category_id': self.category.id,
            'sequence': 10,
        })
        self.tax = self.env['odfe.product.tax'].create({
            'name': 'GST 5%',
            'type': 'percentage',
            'percentage': 5.0,
            'applicable_on': 'all',
        })

    def test_product_creation(self):
        self.assertTrue(self.product.active)
        self.assertEqual(self.product.name, 'Test Cola')
        self.assertEqual(self.product.list_price, 2.50)
        self.assertEqual(self.product.category_id.id, self.category.id)

    def test_product_category(self):
        self.assertEqual(self.category.display_name, 'Beverages')
        self.assertTrue(self.category.pos_visible)
        child_cat = self.env['odfe.product.category'].create({
            'name': 'Sodas',
            'parent_id': self.category.id,
        })
        self.assertIn('/', child_cat.display_name)
        self.assertEqual(child_cat.parent_id.id, self.category.id)

    def test_product_tax_creation(self):
        self.assertEqual(self.tax.name, 'GST 5%')
        self.assertEqual(self.tax.percentage, 5.0)
        self.assertEqual(self.tax.type, 'percentage')
        self.assertTrue(self.tax.active)
        self.assertEqual(self.tax.applicable_on, 'all')

    def test_tax_percentage_validation(self):
        with self.assertRaises(ValidationError):
            self.env['odfe.product.tax'].create({
                'name': 'Invalid Tax',
                'type': 'percentage',
                'percentage': 150.0,
                'applicable_on': 'all',
            })

    def test_product_category_assignment(self):
        food_cat = self.env['odfe.product.category'].create({
            'name': 'Main Course',
            'sequence': 2,
        })
        food_tmpl = self.env['product.template'].create({
            'name': 'Burger',
            'list_price': 8.99,
            'type': 'product',
        })
        food_product = self.env['odfe.product'].create({
            'product_tmpl_id': food_tmpl.id,
            'category_id': food_cat.id,
        })
        self.assertTrue(food_product.is_food)
        self.assertFalse(food_product.is_beverage)
        self.assertEqual(food_product.tax_type, 'food')

    def test_product_tax_type_computation(self):
        drink_cat = self.env['odfe.product.category'].create({
            'name': 'Juice',
            'sequence': 3,
        })
        drink_tmpl = self.env['product.template'].create({
            'name': 'Orange Juice',
            'list_price': 3.99,
            'type': 'product',
        })
        drink = self.env['odfe.product'].create({
            'product_tmpl_id': drink_tmpl.id,
            'category_id': drink_cat.id,
        })
        self.assertTrue(drink.is_beverage)
        self.assertFalse(drink.is_food)
        self.assertEqual(drink.tax_type, 'beverage')

    def test_product_untyped_category(self):
        other_cat = self.env['odfe.product.category'].create({
            'name': 'Merchandise',
            'sequence': 4,
        })
        merch_tmpl = self.env['product.template'].create({
            'name': 'T-Shirt',
            'list_price': 19.99,
            'type': 'product',
        })
        merch = self.env['odfe.product'].create({
            'product_tmpl_id': merch_tmpl.id,
            'category_id': other_cat.id,
        })
        self.assertFalse(merch.is_food)
        self.assertFalse(merch.is_beverage)
        self.assertEqual(merch.tax_type, 'all')


@tagged('odfe', 'pos', 'models')
class TestCustomer(TransactionCase):

    def setUp(self):
        super().setUp()
        self.customer = self.env['odfe.customer'].create({
            'name': 'John Doe',
            'phone': '+1234567890',
            'email': 'john@example.com',
        })

    def test_customer_creation(self):
        self.assertEqual(self.customer.name, 'John Doe')
        self.assertEqual(self.customer.phone, '+1234567890')
        self.assertTrue(self.customer.active)
        self.assertEqual(self.customer.tier, 'bronze')

    def test_customer_name_get(self):
        name_tuple = self.customer.name_get()
        self.assertEqual(len(name_tuple), 1)
        self.assertIn('John Doe', name_tuple[0][1])
        self.assertIn(self.customer.phone, name_tuple[0][1])

    def test_customer_phone_validation(self):
        with self.assertRaises(ValidationError):
            self.env['odfe.customer'].create({
                'name': 'Bad Phone',
                'phone': 'abc123',
            })

    def test_customer_phone_unique(self):
        with self.assertRaises(Exception):
            self.env['odfe.customer'].create({
                'name': 'Duplicate Phone',
                'phone': '+1234567890',
            })

    def test_customer_name_search(self):
        result = self.env['odfe.customer'].name_search('John')
        self.assertTrue(len(result) >= 1)

    def test_customer_loyalty_enrollment(self):
        program = self.env['odfe.loyalty.program'].create({
            'name': 'Standard Points',
            'program_type': 'points',
            'points_per_currency': 10.0,
            'reward_type': 'discount',
            'reward_value': 5.0,
        })
        self.assertEqual(program.member_count, 0)
        loyalty = self.env['odfe.customer.loyalty'].create({
            'customer_id': self.customer.id,
            'program_id': program.id,
            'points_earned': 100.0,
        })
        self.assertEqual(loyalty.points_balance, 100.0)
        self.assertEqual(loyalty.tier, 'bronze')
        self.assertEqual(program.member_count, 1)

    def test_loyalty_points_earn_and_redeem(self):
        program = self.env['odfe.loyalty.program'].create({
            'name': 'Points Program',
            'program_type': 'points',
            'points_per_currency': 10.0,
            'reward_type': 'discount',
            'reward_value': 5.0,
        })
        loyalty = self.env['odfe.customer.loyalty'].create({
            'customer_id': self.customer.id,
            'program_id': program.id,
            'points_earned': 500.0,
        })
        self.assertEqual(loyalty.points_balance, 500.0)
        loyalty.redeem_points(200.0)
        self.assertEqual(loyalty.points_redeemed, 200.0)
        self.assertEqual(loyalty.points_balance, 300.0)

    def test_loyalty_insufficient_points(self):
        program = self.env['odfe.loyalty.program'].create({
            'name': 'Points Program',
            'program_type': 'points',
            'points_per_currency': 10.0,
            'reward_type': 'discount',
            'reward_value': 5.0,
        })
        loyalty = self.env['odfe.customer.loyalty'].create({
            'customer_id': self.customer.id,
            'program_id': program.id,
            'points_earned': 50.0,
        })
        with self.assertRaises(UserError):
            loyalty.redeem_points(100.0)

    def test_loyalty_program_date_validation(self):
        with self.assertRaises(ValidationError):
            self.env['odfe.loyalty.program'].create({
                'name': 'Bad Dates',
                'program_type': 'points',
                'points_per_currency': 1.0,
                'reward_type': 'discount',
                'reward_value': 5.0,
                'start_date': datetime.now().date() + timedelta(days=5),
                'end_date': datetime.now().date(),
            })

    def test_loyalty_tier_progression(self):
        program = self.env['odfe.loyalty.program'].create({
            'name': 'Tier Prog',
            'program_type': 'spend',
            'points_per_currency': 1.0,
            'min_spend': 0.0,
            'reward_type': 'discount',
            'reward_value': 10.0,
        })
        loyalty = self.env['odfe.customer.loyalty'].create({
            'customer_id': self.customer.id,
            'program_id': program.id,
        })
        self.assertEqual(loyalty.tier, 'bronze')


@tagged('odfe', 'pos', 'models')
class TestFloorTable(TransactionCase):

    def setUp(self):
        super().setUp()
        self.floor = self.env['odfe.floor'].create({
            'name': 'Ground Floor',
            'code': 'G01',
        })
        self.table = self.env['odfe.table'].create({
            'name': 'Table-1',
            'floor_id': self.floor.id,
            'capacity': 4,
            'state': 'free',
        })

    def test_floor_creation(self):
        self.assertEqual(self.floor.name, 'Ground Floor')
        self.assertEqual(self.floor.code, 'G01')
        self.assertTrue(self.floor.active)

    def test_table_creation(self):
        self.assertEqual(self.table.name, 'Table-1')
        self.assertEqual(self.table.capacity, 4)
        self.assertEqual(self.table.state, 'free')
        self.assertEqual(self.table.floor_id.id, self.floor.id)

    def test_floor_unique_code(self):
        with self.assertRaises(Exception):
            self.env['odfe.floor'].create({
                'name': 'Duplicate Floor',
                'code': 'G01',
            })

    def test_table_capacity_constraint(self):
        with self.assertRaises(Exception):
            self.env['odfe.table'].create({
                'name': 'Bad Table',
                'floor_id': self.floor.id,
                'capacity': 0,
            })

    def test_table_state_transitions(self):
        self.assertEqual(self.table.state, 'free')
        self.table.set_occupied()
        self.assertEqual(self.table.state, 'occupied')
        self.table.set_free()
        self.assertEqual(self.table.state, 'free')
        self.table.set_reserved()
        self.assertEqual(self.table.state, 'reserved')

    def test_table_status_history_logged(self):
        self.table.set_occupied()
        history = self.env['odfe.table.status.history'].search([
            ('table_id', '=', self.table.id),
        ])
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0].state_from, 'free')
        self.assertEqual(history[0].state_to, 'occupied')
        self.table.set_free()
        history = self.env['odfe.table.status.history'].search([
            ('table_id', '=', self.table.id),
        ])
        self.assertEqual(len(history), 2)

    def test_table_floor_relation(self):
        self.assertIn(self.table, self.floor.table_ids)
        self.assertEqual(len(self.floor.table_ids), 1)


@tagged('odfe', 'pos', 'models')
class TestOrder(TransactionCase):

    def setUp(self):
        super().setUp()
        self.floor = self.env['odfe.floor'].create({
            'name': 'First Floor',
            'code': 'F01',
        })
        self.table = self.env['odfe.table'].create({
            'name': 'Table-A',
            'floor_id': self.floor.id,
            'capacity': 2,
        })
        self.product_tmpl = self.env['product.template'].create({
            'name': 'Pizza',
            'list_price': 12.99,
            'type': 'product',
        })
        self.product = self.env['odfe.product'].create({
            'product_tmpl_id': self.product_tmpl.id,
        })
        self.session = self.env['odfe.pos.session'].create({
            'user_id': self.env.user.id,
        })
        self.session.action_open()

    def test_session_open_and_close(self):
        self.assertEqual(self.session.state, 'opened')
        self.assertIsNotNone(self.session.opened_at)
        self.session.action_close(cash_count=500.0)
        self.assertEqual(self.session.state, 'closed')
        self.assertIsNotNone(self.session.closed_at)
        self.assertEqual(self.session.end_cash, 500.0)

    def test_session_close_from_wrong_state(self):
        self.session.action_close()
        with self.assertRaises(UserError):
            self.session.action_close()

    def test_order_creation(self):
        order = self.env['odfe.pos.order'].create({
            'session_id': self.session.id,
            'table_id': self.table.id,
            'state': 'draft',
        })
        self.assertTrue(order.name)
        self.assertEqual(order.state, 'draft')
        self.assertEqual(order.table_id.id, self.table.id)

    def test_order_state_transitions(self):
        order = self.env['odfe.pos.order'].create({
            'session_id': self.session.id,
            'state': 'draft',
        })
        order.action_confirm()
        self.assertEqual(order.state, 'confirmed')
        with self.assertRaises(UserError):
            order.action_confirm()

    def test_order_pay_flow(self):
        order = self.env['odfe.pos.order'].create({
            'session_id': self.session.id,
            'state': 'draft',
        })
        order.action_confirm()
        order.action_pay()
        self.assertEqual(order.state, 'paid')
        self.assertIsNotNone(order.paid_at)

    def test_order_cancel(self):
        order = self.env['odfe.pos.order'].create({
            'session_id': self.session.id,
            'state': 'draft',
        })
        order.action_cancel(reason='Test cancel')
        self.assertEqual(order.state, 'cancelled')
        self.assertEqual(order.note, 'Test cancel')
        with self.assertRaises(UserError):
            order.action_cancel()

    def test_order_lines(self):
        order = self.env['odfe.pos.order'].create({
            'session_id': self.session.id,
        })
        line = self.env['odfe.pos.order.line'].create({
            'order_id': order.id,
            'product_id': self.product.id,
            'quantity': 2.0,
            'price_unit': 12.99,
        })
        self.assertEqual(len(order.line_ids), 1)
        self.assertEqual(line.price_subtotal, 25.98)
        self.assertEqual(line.subtotal, 25.98)

    def test_order_lines_with_discount(self):
        order = self.env['odfe.pos.order'].create({
            'session_id': self.session.id,
        })
        line = self.env['odfe.pos.order.line'].create({
            'order_id': order.id,
            'product_id': self.product.id,
            'quantity': 2.0,
            'price_unit': 10.0,
            'discount_type': 'percentage',
            'discount_value': 10.0,
        })
        self.assertEqual(line.price_subtotal, 20.0)
        self.assertEqual(line.discount_amount, 2.0)
        self.assertEqual(line.subtotal, 18.0)

    def test_order_lines_with_tax(self):
        tax = self.env['odfe.product.tax'].create({
            'name': 'VAT 10%',
            'type': 'percentage',
            'percentage': 10.0,
            'applicable_on': 'all',
        })
        order = self.env['odfe.pos.order'].create({
            'session_id': self.session.id,
        })
        line = self.env['odfe.pos.order.line'].create({
            'order_id': order.id,
            'product_id': self.product.id,
            'quantity': 1.0,
            'price_unit': 100.0,
            'tax_id': tax.id,
        })
        self.assertEqual(line.tax_amount, 10.0)
        self.assertEqual(line.subtotal, 110.0)

    def test_order_total_computation(self):
        order = self.env['odfe.pos.order'].create({
            'session_id': self.session.id,
        })
        self.env['odfe.pos.order.line'].create({
            'order_id': order.id,
            'product_id': self.product.id,
            'quantity': 3.0,
            'price_unit': 10.0,
        })
        self.assertEqual(order.subtotal, 30.0)
        self.assertEqual(order.total, 30.0)

    def test_order_refund(self):
        order = self.env['odfe.pos.order'].create({
            'session_id': self.session.id,
        })
        self.env['odfe.pos.order.line'].create({
            'order_id': order.id,
            'product_id': self.product.id,
            'quantity': 1.0,
            'price_unit': 25.0,
        })
        order.action_confirm()
        order.action_pay()
        self.assertEqual(order.state, 'paid')
        refund = order.action_refund()
        self.assertEqual(order.state, 'refunded')
        self.assertEqual(refund.state, 'refunded')
        for line in refund.line_ids:
            self.assertEqual(line.quantity, -1.0)

    def test_order_refund_only_paid(self):
        order = self.env['odfe.pos.order'].create({
            'session_id': self.session.id,
        })
        with self.assertRaises(UserError):
            order.action_refund()

    def test_order_line_quantity_constraint(self):
        order = self.env['odfe.pos.order'].create({
            'session_id': self.session.id,
        })
        with self.assertRaises(ValidationError):
            self.env['odfe.pos.order.line'].create({
                'order_id': order.id,
                'product_id': self.product.id,
                'quantity': -1.0,
                'price_unit': 10.0,
            })

    def test_order_with_modifiers(self):
        order = self.env['odfe.pos.order'].create({
            'session_id': self.session.id,
        })
        main_line = self.env['odfe.pos.order.line'].create({
            'order_id': order.id,
            'product_id': self.product.id,
            'quantity': 1.0,
            'price_unit': 10.0,
        })
        modifier = self.env['odfe.pos.order.line'].create({
            'order_id': order.id,
            'product_id': self.product.id,
            'quantity': 1.0,
            'price_unit': 2.0,
            'is_modifier': True,
            'parent_line_id': main_line.id,
        })
        self.assertTrue(modifier.is_modifier)
        self.assertEqual(modifier.parent_line_id.id, main_line.id)

    def test_session_totals(self):
        order = self.env['odfe.pos.order'].create({
            'session_id': self.session.id,
        })
        self.env['odfe.pos.order.line'].create({
            'order_id': order.id,
            'product_id': self.product.id,
            'quantity': 2.0,
            'price_unit': 15.0,
        })
        order.action_confirm()
        order.action_pay()
        self.assertEqual(self.session.total_orders, 1)
        self.assertEqual(self.session.total_sales, 30.0)

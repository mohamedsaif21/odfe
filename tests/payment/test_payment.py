from odoo.tests import TransactionCase, tagged
from odoo.exceptions import ValidationError


@tagged('odfe', 'payment', 'pos')
class TestPaymentMethod(TransactionCase):

    def setUp(self):
        super().setUp()
        self.cash_method = self.env['odfe.payment.method'].create({
            'name': 'Cash',
            'code': 'CASH',
            'type': 'cash',
        })
        self.card_method = self.env['odfe.payment.method'].create({
            'name': 'Credit Card',
            'code': 'CARD',
            'type': 'card',
        })
        self.upi_method = self.env['odfe.payment.method'].create({
            'name': 'UPI',
            'code': 'UPI',
            'type': 'upi',
        })

    def test_payment_method_creation(self):
        self.assertEqual(self.cash_method.name, 'Cash')
        self.assertEqual(self.cash_method.code, 'CASH')
        self.assertEqual(self.cash_method.type, 'cash')
        self.assertTrue(self.cash_method.active)

    def test_payment_method_unique_code(self):
        with self.assertRaises(Exception):
            self.env['odfe.payment.method'].create({
                'name': 'Duplicate Cash',
                'code': 'CASH',
                'type': 'cash',
            })

    def test_default_method_uniqueness(self):
        self.cash_method.write({'is_default': True})
        with self.assertRaises(ValidationError):
            self.card_method.write({'is_default': True})

    def test_default_method_creation(self):
        self.card_method.write({'is_default': True})
        with self.assertRaises(ValidationError):
            self.env['odfe.payment.method'].create({
                'name': 'Another Default',
                'code': 'DEF',
                'type': 'other',
                'is_default': True,
            })

    def test_multiple_methods(self):
        self.assertEqual(len(self.env['odfe.payment.method'].search([])), 3)


@tagged('odfe', 'payment', 'pos')
class TestCashPayment(TransactionCase):

    def setUp(self):
        super().setUp()
        self.floor = self.env['odfe.floor'].create({
            'name': 'Payment Floor',
            'code': 'PAY01',
        })
        self.table = self.env['odfe.table'].create({
            'name': 'Pay-Table',
            'floor_id': self.floor.id,
        })
        self.product_tmpl = self.env['product.template'].create({
            'name': 'Pay Product',
            'list_price': 25.00,
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
        self.env['odfe.pos.order.line'].create({
            'order_id': self.order.id,
            'product_id': self.product.id,
            'quantity': 1.0,
            'price_unit': 25.00,
        })
        self.cash_method = self.env['odfe.payment.method'].create({
            'name': 'Cash',
            'code': 'CASH',
            'type': 'cash',
        })

    def test_cash_payment_creation(self):
        payment = self.env['odfe.payment.cash'].create({
            'order_id': self.order.id,
            'session_id': self.session.id,
            'method_id': self.cash_method.id,
            'amount': 25.00,
            'cash_received': 30.00,
        })
        self.assertEqual(payment.amount, 25.00)
        self.assertEqual(payment.state, 'draft')

    def test_cash_change_calculation(self):
        payment = self.env['odfe.payment.cash'].create({
            'order_id': self.order.id,
            'session_id': self.session.id,
            'method_id': self.cash_method.id,
            'amount': 25.00,
            'cash_received': 30.00,
        })
        self.assertEqual(payment.change_given, 5.00)

    def test_cash_exact_change(self):
        payment = self.env['odfe.payment.cash'].create({
            'order_id': self.order.id,
            'session_id': self.session.id,
            'method_id': self.cash_method.id,
            'amount': 25.00,
            'cash_received': 25.00,
        })
        self.assertEqual(payment.change_given, 0.0)

    def test_cash_payment_completion(self):
        payment = self.env['odfe.payment.cash'].create({
            'order_id': self.order.id,
            'session_id': self.session.id,
            'method_id': self.cash_method.id,
            'amount': 25.00,
            'cash_received': 25.00,
        })
        payment.action_complete()
        self.assertEqual(payment.state, 'completed')
        self.assertIsNotNone(payment.paid_at)

    def test_cash_payment_fail(self):
        payment = self.env['odfe.payment.cash'].create({
            'order_id': self.order.id,
            'session_id': self.session.id,
            'method_id': self.cash_method.id,
            'amount': 25.00,
            'cash_received': 25.00,
        })
        payment.action_fail()
        self.assertEqual(payment.state, 'failed')

    def test_cash_payment_refund(self):
        payment = self.env['odfe.payment.cash'].create({
            'order_id': self.order.id,
            'session_id': self.session.id,
            'method_id': self.cash_method.id,
            'amount': 25.00,
            'cash_received': 25.00,
        })
        payment.action_complete()
        payment.action_refund()
        self.assertEqual(payment.state, 'refunded')

    def test_cash_payment_draft_cycle(self):
        payment = self.env['odfe.payment.cash'].create({
            'order_id': self.order.id,
            'session_id': self.session.id,
            'method_id': self.cash_method.id,
            'amount': 25.00,
            'cash_received': 25.00,
        })
        payment.action_complete()
        payment.action_draft()
        self.assertEqual(payment.state, 'draft')
        self.assertFalse(payment.paid_at)

    def test_cash_negative_amount_validation(self):
        with self.assertRaises(ValidationError):
            payment = self.env['odfe.payment'].create({
                'order_id': self.order.id,
                'session_id': self.session.id,
                'method_id': self.cash_method.id,
                'amount': -10.00,
            })
            payment.action_complete()


@tagged('odfe', 'payment', 'pos')
class TestCardPayment(TransactionCase):

    def setUp(self):
        super().setUp()
        self.floor = self.env['odfe.floor'].create({
            'name': 'Card Floor',
            'code': 'CRD01',
        })
        self.table = self.env['odfe.table'].create({
            'name': 'Card-Table',
            'floor_id': self.floor.id,
        })
        self.product_tmpl = self.env['product.template'].create({
            'name': 'Card Product',
            'list_price': 50.00,
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
        self.env['odfe.pos.order.line'].create({
            'order_id': self.order.id,
            'product_id': self.product.id,
            'quantity': 1.0,
            'price_unit': 50.00,
        })
        self.card_method = self.env['odfe.payment.method'].create({
            'name': 'Visa',
            'code': 'VISA',
            'type': 'card',
        })

    def test_card_payment_creation(self):
        payment = self.env['odfe.payment.card'].create({
            'order_id': self.order.id,
            'session_id': self.session.id,
            'method_id': self.card_method.id,
            'amount': 50.00,
            'card_type': 'credit',
            'card_last_four': '1234',
            'cardholder_name': 'John Doe',
            'authorization_code': 'AUTH123',
        })
        self.assertEqual(payment.card_type, 'credit')
        self.assertEqual(payment.card_last_four, '1234')
        self.assertEqual(payment.authorization_code, 'AUTH123')

    def test_card_last_four_validation(self):
        with self.assertRaises(ValidationError):
            self.env['odfe.payment.card'].create({
                'order_id': self.order.id,
                'session_id': self.session.id,
                'method_id': self.card_method.id,
                'amount': 50.00,
                'card_type': 'debit',
                'card_last_four': '123',
            })

    def test_card_last_four_alpha_validation(self):
        with self.assertRaises(ValidationError):
            self.env['odfe.payment.card'].create({
                'order_id': self.order.id,
                'session_id': self.session.id,
                'method_id': self.card_method.id,
                'amount': 50.00,
                'card_type': 'credit',
                'card_last_four': 'ABCD',
            })

    def test_card_authorization_flow(self):
        payment = self.env['odfe.payment.card'].create({
            'order_id': self.order.id,
            'session_id': self.session.id,
            'method_id': self.card_method.id,
            'amount': 50.00,
            'card_type': 'debit',
        })
        payment.action_complete()
        self.assertEqual(payment.state, 'completed')


@tagged('odfe', 'payment', 'pos')
class TestUpiPayment(TransactionCase):

    def setUp(self):
        super().setUp()
        self.floor = self.env['odfe.floor'].create({
            'name': 'UPI Floor',
            'code': 'UPI01',
        })
        self.table = self.env['odfe.table'].create({
            'name': 'UPI-Table',
            'floor_id': self.floor.id,
        })
        self.product_tmpl = self.env['product.template'].create({
            'name': 'UPI Product',
            'list_price': 100.00,
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
        self.env['odfe.pos.order.line'].create({
            'order_id': self.order.id,
            'product_id': self.product.id,
            'quantity': 1.0,
            'price_unit': 100.00,
        })
        self.upi_method = self.env['odfe.payment.method'].create({
            'name': 'Google Pay',
            'code': 'GPAY',
            'type': 'upi',
        })

    def test_upi_payment_creation(self):
        payment = self.env['odfe.payment.upi'].create({
            'order_id': self.order.id,
            'session_id': self.session.id,
            'method_id': self.upi_method.id,
            'amount': 100.00,
            'upi_id': 'merchant@upi',
            'upi_app': 'gpay',
        })
        self.assertEqual(payment.upi_id, 'merchant@upi')
        self.assertEqual(payment.upi_app, 'gpay')
        self.assertEqual(payment.amount, 100.00)

    def test_upi_payment_completion(self):
        payment = self.env['odfe.payment.upi'].create({
            'order_id': self.order.id,
            'session_id': self.session.id,
            'method_id': self.upi_method.id,
            'amount': 100.00,
            'upi_id': 'merchant@upi',
            'transaction_id': 'TXN123456',
        })
        payment.action_complete()
        self.assertEqual(payment.state, 'completed')

    def test_upi_qr_generator_creation(self):
        qr = self.env['odfe.payment.qr.generator'].create({
            'name': 'Test QR',
            'upi_id': 'merchant@upi',
            'merchant_name': 'Test Restaurant',
            'amount': 250.00,
        })
        self.assertEqual(qr.name, 'Test QR')
        self.assertEqual(qr.upi_id, 'merchant@upi')

    def test_upi_payload_build(self):
        qr = self.env['odfe.payment.qr.generator'].create({
            'name': 'Payload Test',
            'upi_id': 'pay@restaurant',
            'merchant_name': 'My Restaurant',
            'amount': 99.99,
        })
        payload = qr._build_upi_payload()
        self.assertIn('upi://pay', payload)
        self.assertIn('pa=pay@restaurant', payload)
        self.assertIn('pn=My Restaurant', payload)
        self.assertIn('am=99.99', payload)

    def test_upi_payload_no_amount(self):
        qr = self.env['odfe.payment.qr.generator'].create({
            'name': 'No Amount QR',
            'upi_id': 'pay@restaurant',
            'merchant_name': 'Test',
        })
        payload = qr._build_upi_payload()
        self.assertNotIn('am=', payload)

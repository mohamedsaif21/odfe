from odoo.tests import TransactionCase, tagged
from odoo.exceptions import AccessError


@tagged('odfe', 'pos', 'security')
class TestSecurity(TransactionCase):

    def setUp(self):
        super().setUp()
        self.category = self.env['odfe.product.category'].create({
            'name': 'Test Category',
        })
        self.product_tmpl = self.env['product.template'].create({
            'name': 'Test Item',
            'list_price': 10.0,
            'type': 'product',
        })
        self.product = self.env['odfe.product'].create({
            'product_tmpl_id': self.product_tmpl.id,
            'category_id': self.category.id,
        })
        self.floor = self.env['odfe.floor'].create({
            'name': 'Test Floor',
            'code': 'SEC01',
        })
        self.table = self.env['odfe.table'].create({
            'name': 'Sec-Table',
            'floor_id': self.floor.id,
        })

    def test_admin_can_create_product(self):
        self.env.user.write({
            'groups_id': [(4, self.env.ref('base.group_system').id)],
        })
        product = self.env['odfe.product'].create({
            'product_tmpl_id': self.product_tmpl.id,
            'name': 'Admin Product',
        })
        self.assertTrue(product)

    def test_employee_roles_exist(self):
        employee = self.env['odfe.employee'].create({
            'name': 'Test Cashier',
            'role': 'cashier',
            'pin': '1234',
        })
        self.assertEqual(employee.role, 'cashier')
        self.assertTrue(employee.pin)

    def test_employee_pin_validation(self):
        with self.assertRaises(Exception):
            self.env['odfe.employee'].create({
                'name': 'Bad PIN',
                'role': 'cashier',
                'pin': 'abc',
            })

    def test_employee_email_validation(self):
        with self.assertRaises(Exception):
            self.env['odfe.employee'].create({
                'name': 'Bad Email',
                'role': 'manager',
                'email': 'not-an-email',
            })

    def test_manager_role(self):
        manager = self.env['odfe.employee'].create({
            'name': 'Test Manager',
            'role': 'manager',
            'pin': '9999',
        })
        self.assertEqual(manager.role, 'manager')

    def test_kitchen_role(self):
        kitchen = self.env['odfe.employee'].create({
            'name': 'Chef',
            'role': 'kitchen',
            'pin': '4321',
        })
        self.assertEqual(kitchen.role, 'kitchen')

    def test_waiter_role(self):
        waiter = self.env['odfe.employee'].create({
            'name': 'Waiter Bob',
            'role': 'waiter',
        })
        self.assertEqual(waiter.role, 'waiter')

    def test_role_permission_structure(self):
        role = self.env['odfe.role'].create({
            'name': 'Cashier Role',
            'code': 'CASHIER',
        })
        permission = self.env['odfe.role.permission'].create({
            'role_id': role.id,
            'model': 'odfe.product',
            'perm_read': True,
            'perm_write': False,
            'perm_create': False,
            'perm_unlink': False,
        })
        self.assertTrue(permission.perm_read)
        self.assertFalse(permission.perm_write)
        self.assertEqual(permission.model, 'odfe.product')
        self.assertEqual(permission.role_id.id, role.id)

    def test_full_access_role(self):
        role = self.env['odfe.role'].create({
            'name': 'Admin Role',
            'code': 'ADMIN',
        })
        permission = self.env['odfe.role.permission'].create({
            'role_id': role.id,
            'model': 'odfe.pos.order',
            'perm_read': True,
            'perm_write': True,
            'perm_create': True,
            'perm_unlink': True,
        })
        self.assertTrue(all([
            permission.perm_read,
            permission.perm_write,
            permission.perm_create,
            permission.perm_unlink,
        ]))

    def test_duplicate_role_code_constraint(self):
        self.env['odfe.role'].create({
            'name': 'Manager Role',
            'code': 'MGR',
        })
        with self.assertRaises(Exception):
            self.env['odfe.role'].create({
                'name': 'Also Manager',
                'code': 'MGR',
            })

    def test_employee_user_link(self):
        user = self.env['res.users'].create({
            'name': 'Test User',
            'login': 'testuser_sec@test.com',
        })
        employee = self.env['odfe.employee'].create({
            'name': 'Linked Employee',
            'role': 'manager',
            'user_id': user.id,
        })
        self.assertEqual(employee.user_id.id, user.id)

    def test_table_status_history_security(self):
        self.table.set_occupied()
        history = self.env['odfe.table.status.history'].search([
            ('table_id', '=', self.table.id),
        ])
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0].changed_by.id, self.env.user.id)

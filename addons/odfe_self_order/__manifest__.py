{
    'name': 'ODFE Self Order',
    'version': '19.0.1.0.0',
    'category': 'Restaurant',
    'summary': 'QR-based self-ordering for restaurants',
    'description': """
        QR-based self-ordering system for restaurants.
        Customers scan a QR code at their table to browse the menu,
        place orders, and pay from their mobile device.
    """,
    'depends': [
        'odfe_product',
        'odfe_floor',
        'odfe_customer',
        'odfe_coupon',
        'odfe_payment',
        'odfe_pos',
        'odfe_base',
        'odfe_realtime',
    ],
    'data': [
        'security/ir.model.access.csv',
        'views/self_order_views.xml',
        'views/menu_views.xml',
        'views/self_order_templates.xml',
        'reports/qr_pdf.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            'odfe_self_order/static/src/scss/self_order_style.scss',
            'odfe_self_order/static/src/js/self_order_app.js',
        ],
    },
    'installable': True,
    'application': True,
    'auto_install': False,
    'license': 'LGPL-3',
}

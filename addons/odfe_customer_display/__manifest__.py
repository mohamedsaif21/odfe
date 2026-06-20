{
    "name": "ODFE Customer Display",
    "version": "19.0.1.0.0",
    "category": "Restaurant/POS",
    "summary": "Customer-facing display screen for the POS terminal",
    "description": "Shows order items, totals, payment QR codes, and thank-you animations on a customer-facing display.",
    "author": "ODFE",
    "website": "https://odfe.app",
    "license": "LGPL-3",
    "depends": [
        "odfe_pos",
        "odfe_payment",
    ],
    "data": [
        "views/display_templates.xml",
        "views/menu_views.xml",
    ],
    "assets": {
        "web.assets_backend": [
            "odfe_customer_display/static/src/scss/display_style.scss",
            "odfe_customer_display/static/src/js/qr_display.js",
            "odfe_customer_display/static/src/js/order_display.js",
            "odfe_customer_display/static/src/js/payment_display.js",
            "odfe_customer_display/static/src/js/thank_you_screen.js",
            "odfe_customer_display/static/src/js/customer_display_app.js",
        ],
    },
    "installable": True,
    "application": False,
    "auto_install": False,
    "sequence": 15,
}

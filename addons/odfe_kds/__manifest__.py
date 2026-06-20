{
    "name": "ODFE Kitchen Display System",
    "version": "19.0.1.0.0",
    "category": "Restaurant/Kitchen Display",
    "summary": "Real-time Kitchen Display for ODFE POS",
    "description": "Kitchen Display System showing incoming orders with large distance-readable cards, real-time updates, and stage tracking.",
    "author": "ODFE",
    "website": "https://odfe.ai",
    "depends": [
        "odfe_pos",
        "odfe_product",
    ],
    "data": [
        "security/ir.model.access.csv",
        "views/kds_views.xml",
        "views/menu_views.xml",
        "views/kds_dashboard.xml",
    ],
    "assets": {
        "web.assets_backend": [
            "odfe_kds/static/src/js/kds_app.js",
            "odfe_kds/static/src/js/kitchen_board.js",
            "odfe_kds/static/src/js/ticket_card.js",
            "odfe_kds/static/src/js/filters.js",
            "odfe_kds/static/src/js/search.js",
            "odfe_kds/static/src/js/realtime.js",
            "odfe_kds/static/src/scss/kds_style.scss",
        ],
    },
    "installable": True,
    "application": True,
    "auto_install": False,
    "license": "LGPL-3",
}

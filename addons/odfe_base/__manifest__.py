{
    'name': 'ODFE Base',
    'version': '19.0.1.0.0',
    'category': 'Restaurant',
    'summary': 'Shared base models, design system, and configuration for ODFE Restaurant POS',
    'description': 'Provides shared mixins, abstract models, design tokens, and configuration for all ODFE modules.',
    'author': 'ODFE',
    'website': 'https://odfe.app',
    'license': 'LGPL-3',
    'depends': ['base', 'web', 'mail'],
    'data': [
        'security/ir.model.access.csv',
        'data/base_data.xml',
        'views/menu_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'odfe_base/static/src/scss/odfe_base.scss',
            'odfe_base/static/src/scss/_components.scss',
            'odfe_base/static/src/scss/_layout.scss',
        ],
        'web.assets_frontend': [
            'odfe_base/static/src/scss/odfe_base.scss',
            'odfe_base/static/src/scss/_components.scss',
        ],
    },
    'installable': True,
    'application': False,
    'auto_install': False,
    'sequence': 1,
}

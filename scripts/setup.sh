#!/bin/bash
set -e
echo "ODFE Setup"
echo "=========="
echo "Setting up database..."
echo "Installing addons..."
odoo -c odoo.conf -i odfe_base,odfe_auth,odfe_product,odfe_payment,odfe_floor,odfe_customer,odfe_coupon,odfe_booking,odfe_pos,odfe_kds,odfe_customer_display,odfe_self_order,odfe_dashboard,odfe_reports,odfe_realtime --stop-after-init
echo "Setup complete."

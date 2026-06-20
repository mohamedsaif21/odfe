#!/bin/bash
set -e
echo "Installing ODFE dependencies..."
pip install -r requirements.txt
echo "Creating Odoo configuration..."
cp odoo.conf /etc/odoo/odoo.conf 2>/dev/null || true
echo "Installation complete. Run ./scripts/setup.sh to initialize."

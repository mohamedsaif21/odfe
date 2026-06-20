#!/bin/bash
set -e

echo "Deploying ODFE..."
docker-compose build
docker-compose up -d
echo "ODFE deployed successfully."
echo "Access at http://localhost:8069"

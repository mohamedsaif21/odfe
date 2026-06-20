# Deployment

## Prerequisites

- Docker & Docker Compose
- Python 3.10+
- PostgreSQL 16
- Odoo 19

## Docker Deployment

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Manual Deployment

```bash
# Install Python dependencies
pip install -r requirements.txt

# Configure odoo.conf
cp odoo.conf /etc/odoo/odoo.conf

# Initialize database
./scripts/setup.sh

# Start Odoo
odoo -c odoo.conf
```

## Production Checklist

- [ ] Set strong admin password in odoo.conf
- [ ] Configure SSL/TLS
- [ ] Set up PostgreSQL backups
- [ ] Configure workers based on CPU cores
- [ ] Enable multi-threading
- [ ] Set up monitoring
- [ ] Configure email for receipts
- [ ] Set up QR code domain

## Backup

```bash
./scripts/backup.sh
```

## Restore

```bash
./scripts/restore.sh
```

## Updates

```bash
# Pull latest code
git pull

# Restart services
docker-compose restart odoo

# Run Odoo upgrades
docker-compose exec odoo odoo -u all --stop-after-init
```

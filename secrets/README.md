# Postgres password file

Create `secrets/postgres_password` on the droplet (not committed).

```bash
cd /opt/saigon-staff/saigon-corner
mkdir -p secrets
openssl rand -hex 24 > secrets/postgres_password
chmod 600 secrets/postgres_password
# one line, no quotes, no $ % ! £
```

Then:

```bash
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d --build
```

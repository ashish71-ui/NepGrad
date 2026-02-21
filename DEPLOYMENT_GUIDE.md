# NepGrad Deployment Guide (Without Docker)

This guide covers deploying NepGrad (Django + React) on a Linux server without Docker.

## Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Python 3.8+
- Node.js 18+
- Nginx
- Git

---

## Step 1: Server Setup

### Update and Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python and pip
sudo apt install -y python3 python3-pip python3-venv

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git
```

---

## Step 2: Project Setup

### Clone the Project
```bash
cd /var/www
sudo git clone https://github.com/your-repo/NepGrad.git
cd NepGrad
```

### Create Virtual Environment (Backend)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

### Install Backend Dependencies
```bash
pip install -r requirements.txt
```

### Configure Environment Variables
```bash
# Edit settings.py or create .env
nano nepgrad/settings.py
```

Update these settings:
```python
DEBUG = False
ALLOWED_HOSTS = ['your-domain.com', 'your-server-ip']

# For production, use PostgreSQL
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'nepgrad_db',
        'USER': 'nepgrad_user',
        'PASSWORD': 'your-secure-password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

---

## Step 3: Database Setup

### Install PostgreSQL (Optional but Recommended)
```bash
sudo apt install -y postgresql postgresql-contrib

# Create database
sudo -u postgres psql
CREATE DATABASE nepgrad_db;
CREATE USER nepgrad_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE nepgrad_db TO nepgrad_user;
\q
```

### Run Migrations
```bash
cd /var/www/NepGrad/backend
source venv/bin/activate
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

---

## Step 4: Frontend Build

### Install Dependencies and Build
```bash
cd /var/www/NepGrad/frontend
npm install
npm run build
```

The built files will be in `frontend/dist/`

---

## Step 5: Configure Gunicorn (WSGI Server)

### Install Gunicorn
```bash
pip install gunicorn
```

### Create Gunicorn Service
```bash
sudo nano /etc/systemd/system/nepgrad.service
```

Add this content:
```ini
[Unit]
Description=NepGrad Gunicorn Service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/NepGrad/backend
Environment="PATH=/var/www/NepGrad/backend/venv/bin"
ExecStart=/var/www/NepGrad/backend/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8000 nepgrad.wsgi:application

[Install]
WantedBy=multi-user.target
```

### Start Gunicorn
```bash
sudo systemctl start nepgrad
sudo systemctl enable nepgrad
```

---

## Step 6: Configure Nginx

### Create Nginx Config
```bash
sudo nano /etc/nginx/sites-available/nepgrad
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com your-server-ip;

    # Frontend (React build)
    location / {
        root /var/www/NepGrad/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location /static/ {
        alias /var/www/NepGrad/backend/static/;
    }

    # Media files
    location /media/ {
        alias /var/www/NepGrad/backend/media/;
    }
}
```

### Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/nepgrad /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 7: Collect Static Files

```bash
cd /var/www/NepGrad/backend
source venv/bin/activate
python manage.py collectstatic
```

---

## Step 8: Set Permissions

```bash
sudo chown -R www-data:www-data /var/www/NepGrad
sudo chmod -R 755 /var/www/NepGrad
```

---

## Step 9: Firewall Setup

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

---

## Step 10: SSL/HTTPS (Recommended)

### Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Follow the prompts to complete SSL setup.

---

## Maintenance Commands

### Restart Application
```bash
sudo systemctl restart nepgrad
```

### View Logs
```bash
sudo journalctl -u nepgrad -f
```

### Update Application
```bash
cd /var/www/NepGrad
git pull

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic
sudo systemctl restart nepgrad

# Frontend
cd ../frontend
npm install
npm run build
```

---

## Quick Summary

1. Clone project to `/var/www/NepGrad`
2. Set up Python virtual environment and install dependencies
3. Configure database (PostgreSQL recommended)
4. Run migrations
5. Build frontend: `npm run build`
6. Set up Gunicorn as systemd service
7. Configure Nginx to proxy API to Gunicorn and serve frontend
8. Enable SSL (recommended)

Your app should now be live at `http://your-domain.com`!

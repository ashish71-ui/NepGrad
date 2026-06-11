# Deploy NepGrad to nepgrad.ashishdkl.com.np

Your existing project runs via Docker. This guide adds NepGrad as a **subdomain**.

---

## Step 1: Upload Project to Server

Upload the NepGrad folder to your server at:
```
/var/www/NepGrad/
```

---

## Step 2: Set Up Python Environment

```bash
cd /var/www/NepGrad/backend

# Create virtual environment
python3 -m venv venv

# Activate
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install gunicorn
pip install gunicorn
```

---

## Step 3: Configure Django

```bash
nano nepgrad/settings.py
```

Find `ALLOWED_HOSTS` and change to:
```python
ALLOWED_HOSTS = ['nepgrad.ashishdkl.com.np']
```

Save and exit (Ctrl+O, Enter, Ctrl+X)

---

## Step 4: Run Migrations & Collect Static

```bash
cd /var/www/NepGrad/backend
source venv/bin/activate
python manage.py migrate
python manage.py collectstatic
```

---

## Step 5: Build Frontend

```bash
cd /var/www/NepGrad/frontend
npm install
npm run build
```

---

## Step 6: Create Gunicorn Service

```bash
sudo nano /etc/systemd/system/nepgrad.service
```

Paste this:
```ini
[Unit]
Description=NepGrad
After=network.target

[Service]
User=root
Group=root
WorkingDirectory=/var/www/NepGrad/backend
Environment="PATH=/var/www/NepGrad/backend/venv/bin"
ExecStart=/var/www/NepGrad/backend/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8001 nepgrad.wsgi:application

[Install]
WantedBy=multi-user.target
```

Start it:
```bash
sudo systemctl start nepgrad
sudo systemctl enable nepgrad
```

---

## Step 7: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/nepgrad
```

Paste this (replace your existing Docker config if needed):
```nginx
server {
    listen 80;
    server_name nepgrad.ashishdkl.com.np;

    # Frontend (React)
    location / {
        root /var/www/NepGrad/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Static files
    location /static/ {
        alias /var/www/NepGrad/backend/staticfiles/;
    }
}
```

Enable and reload:
```bash
sudo ln -s /etc/nginx/sites-available/nepgrad /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 8: Set Permissions

```bash
sudo chown -R www-data:www-data /var/www/NepGrad
```

---

## Step 9: Access

Open browser and go to:
```
http://nepgrad.ashishdkl.com.np
```

---

## Commands for Later

```bash
# Restart NepGrad after changes
sudo systemctl restart nepgrad

# Check status
sudo systemctl status nepgrad

# View logs
sudo journalctl -u nepgrad -f

# After code updates
cd /var/www/NepGrad
git pull
cd backend && source venv/bin/activate && python manage.py migrate
cd ../frontend && npm run build
sudo systemctl restart nepgrad
```

---

## Troubleshooting

If not working:
```bash
# Check if gunicorn is running
sudo systemctl status nepgrad

# Check nginx
sudo nginx -t

# Check ports
sudo netstat -tlnp | grep 8001
```

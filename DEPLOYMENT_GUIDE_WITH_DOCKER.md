# NepGrad Deployment Guide (With Existing Docker Project)

Since you already have a project running via Docker, here are your options to add NepGrad:

---

## Option 1: Subdirectory (e.g., yourdomain.com/nepgrad)

### Nginx Config Update

Update your existing Nginx config to include NepGrad:

```nginx
# Add this to your existing server block

# NepGrad Frontend at /nepgrad/
location /nepgrad/ {
    alias /var/www/NepGrad/frontend/dist/;
    index index.html;
    try_files $uri $uri/ /nepgrad/index.html;
}

# NepGrad Backend API at /nepgrad/api/
location /nepgrad/api/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Remove /nepgrad prefix when forwarding
    rewrite ^/nepgrad/api/(.*)$ /$1 break;
}

# Static files
location /nepgrad/static/ {
    alias /var/www/NepGrad/backend/static/;
}
```

### Frontend Config Update

Update `frontend/.env`:
```env
VITE_API_URL=http://yourdomain.com/nepgrad/api
```

Rebuild frontend:
```bash
cd frontend
npm run build
```

### Gunicorn Config (with URL prefix)

Update Gunicorn to handle the `/api` prefix:
```bash
gunicorn --bind 0.0.0.0:8000 nepgrad.wsgi:application --prefix /api
```

---

## Option 2: Subdomain (e.g., nepgrad.yourdomain.com)

### Create New Server Block

```nginx
server {
    listen 80;
    server_name nepgrad.yourdomain.com;

    # Frontend
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

    location /static/ {
        alias /var/www/NepGrad/backend/static/;
    }
}
```

Then enable:
```bash
sudo ln -s /etc/nginx/sites-available/nepgrad-subdomain /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Option 3: Different Port (e.g., yourdomain.com:3000)

### Direct Proxy

```nginx
# Add to existing Docker nginx config
location /nepgrad/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    cache_bypass $http_upgrade;
}
```

### Run NepGrad Directly (No Docker)
```bash
cd /var/www/NepGrad/backend
source venv/bin/activate
python manage.py runserver 0.0.0.0:3000
```

---

## Recommended: Option 1 (Subdirectory)

### Complete Steps

1. **Update Frontend**
```bash
cd /var/www/NepGrad/frontend
echo "VITE_API_URL=http://yourdomain.com/nepgrad/api" > .env
npm run build
```

2. **Update Gunicorn with prefix**
```bash
# Update systemd service
sudo nano /etc/systemd/system/nepgrad.service
```

Change ExecStart line:
```ini
ExecStart=/var/www/NepGrad/backend/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8000 --prefix /api nepgrad.wsgi:application
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart nepgrad
```

3. **Update Nginx**
```bash
sudo nano /etc/nginx/sites-available/default
```

Add locations:
```nginx
# NepGrad Frontend
location /nepgrad/ {
    alias /var/www/NepGrad/frontend/dist/;
    index index.html;
    try_files $uri $uri/ /nepgrad/index.html;
}

# NepGrad API
location /nepgrad/api/ {
    proxy_pass http://127.0.0.1:8000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /nepgrad/static/ {
    alias /var/www/NepGrad/backend/static/;
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

4. **Update Django Settings**
```python
# backend/nepgrad/settings.py
ALLOWED_HOSTS = ['yourdomain.com', 'www.yourdomain.com']

# Add trailing slash for API
CORS_ALLOWED_ORIGINS = [
    "http://yourdomain.com",
    "http://yourdomain.com/nepgrad",
]
```

---

## Summary

| Option | URL | Complexity |
|--------|-----|------------|
| Subdirectory | yourdomain.com/nepgrad | Medium |
| Subdomain | nepgrad.yourdomain.com | Easy |
| Different Port | yourdomain.com:3000 | Easy |

**Recommended**: Use **subdirectory** if you want everything under one domain. Use **subdomain** if you want cleaner separation.

After setup, access NepGrad at: `http://yourdomain.com/nepgrad/`

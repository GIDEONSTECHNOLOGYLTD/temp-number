# TempSMS Pro - Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager
- Git (for version control)
- A server (VPS, cloud instance, etc.) for production deployment

### Local Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/GIDEONSTECHNOLOGYLTD/temp-number.git
cd temp-number
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` file with your configurations:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-CHANGE-THIS
DATABASE_PATH=./tempsms.db
SMS_API_KEY=your-5sim-api-key
```

4. **Start the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Deployment

#### Option 1: VPS/Cloud Server (Ubuntu/Debian)

1. **Update system and install Node.js**
```bash
sudo apt update
sudo apt install -y nodejs npm nginx
```

2. **Clone and setup the application**
```bash
cd /var/www
git clone https://github.com/GIDEONSTECHNOLOGYLTD/temp-number.git
cd temp-number
npm install --production
```

3. **Setup environment variables**
```bash
nano .env
```

Configure production settings:
```env
PORT=3000
NODE_ENV=production
JWT_SECRET=STRONG-RANDOM-SECRET-KEY-HERE
DATABASE_PATH=/var/www/temp-number/tempsms.db
SMS_API_KEY=your-production-api-key
```

4. **Setup PM2 for process management**
```bash
npm install -g pm2
pm2 start server.js --name tempsms-pro
pm2 startup
pm2 save
```

5. **Configure Nginx as reverse proxy**
```bash
sudo nano /etc/nginx/sites-available/tempsms
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/tempsms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

6. **Setup SSL with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### Option 2: Heroku Deployment

1. **Install Heroku CLI**
```bash
npm install -g heroku
```

2. **Login and create app**
```bash
heroku login
heroku create your-app-name
```

3. **Set environment variables**
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret-key
heroku config:set SMS_API_KEY=your-api-key
```

4. **Create Procfile**
```bash
echo "web: node server.js" > Procfile
```

5. **Deploy**
```bash
git push heroku main
heroku open
```

#### Option 3: Vercel/Netlify (Serverless)

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Deploy**
```bash
vercel --prod
```

3. **Configure environment variables** in Vercel dashboard

### Database Management

The application uses SQLite by default. For production:

**Option 1: Continue with SQLite**
- Ensure regular backups
- Location: `./tempsms.db`

**Option 2: Migrate to PostgreSQL**
- Update `database.js` to use PostgreSQL
- Install `pg` package: `npm install pg`
- Update connection string in `.env`

### Monitoring & Maintenance

**View logs**
```bash
pm2 logs tempsms-pro
```

**Restart application**
```bash
pm2 restart tempsms-pro
```

**Application status**
```bash
pm2 status
```

**Database backup**
```bash
cp tempsms.db tempsms_backup_$(date +%Y%m%d).db
```

### Security Checklist

- ✅ Change default JWT_SECRET
- ✅ Enable HTTPS/SSL
- ✅ Configure CORS properly
- ✅ Set up rate limiting
- ✅ Regular database backups
- ✅ Keep dependencies updated
- ✅ Use environment variables for secrets
- ✅ Enable firewall on server
- ✅ Regular security audits

### Performance Optimization

1. **Enable compression**
```bash
npm install compression
```

Add to `server.js`:
```javascript
const compression = require('compression');
app.use(compression());
```

2. **Setup Redis for caching** (Optional)
```bash
npm install redis
```

3. **Database indexing**
- Ensure indexes on frequently queried fields

### Troubleshooting

**Port already in use**
```bash
lsof -ti:3000 | xargs kill -9
```

**Database locked**
- Ensure only one process accesses SQLite
- Consider PostgreSQL for multiple connections

**WebSocket not working**
- Check firewall settings
- Ensure proxy passes WebSocket connections

### Support

For issues and questions:
- GitHub Issues: https://github.com/GIDEONSTECHNOLOGYLTD/temp-number/issues
- Documentation: Check README.md

### License

MIT License - See LICENSE file for details

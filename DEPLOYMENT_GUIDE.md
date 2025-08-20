# 🚀 Credtz Lead Flow - Deployment Guide

Complete guide for deploying the Credtz Lead Flow application to production using Docker and Supabase.

## 📋 Prerequisites

### System Requirements
- **Server**: Linux VPS with 2GB+ RAM, 20GB+ storage
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Domain**: Configured with DNS pointing to your server
- **SSL**: Let's Encrypt (automatically configured)

### Supabase Requirements
- Active Supabase project
- Database tables created via migrations
- RLS policies configured
- API keys available

## 🔧 Quick Start

### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again for docker group to take effect
```

### 2. Clone and Configure
```bash
# Clone repository
git clone <your-repo-url> credtz-app
cd credtz-app

# Copy environment template
cp .env.production .env

# Edit configuration (see Configuration section below)
nano .env
```

### 3. Deploy Application
```bash
# Make deploy script executable
chmod +x deploy.sh

# Check requirements
./deploy.sh check

# Deploy application
./deploy.sh deploy
```

## ⚙️ Configuration

### Environment Variables (.env)

```bash
# === SUPABASE CONFIGURATION (Required) ===
SUPABASE_URL=https://qwgsplcqyongfsqdjrme.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_PROJECT_ID=qwgsplcqyongfsqdjrme

# === DEPLOYMENT SETTINGS ===
DOMAIN=your-domain.com                    # Your production domain
ACME_EMAIL=admin@your-domain.com         # Email for SSL certificates

# === SECURITY ===
REDIS_PASSWORD=your-secure-redis-password
POSTGRES_PASSWORD=your-secure-postgres-password  # Only if using local DB

# === OPTIONAL ===
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
```

### Supabase Database Setup

#### Key Tables to Highlight for Integration:

**1. Profiles Table**
```sql
-- User authentication and roles
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  role app_role NOT NULL DEFAULT 'partner',
  name VARCHAR,
  email TEXT,
  phone TEXT,
  cpf TEXT,
  company TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**2. Leads Table**
```sql
-- Main lead management
CREATE TABLE public.leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  phone TEXT NOT NULL,
  convenio TEXT,
  banco_operacao TEXT,
  valor_operacao NUMERIC,
  status TEXT DEFAULT 'new_lead',
  priority TEXT DEFAULT 'medium',
  stage TEXT DEFAULT 'new',
  assigned_to UUID REFERENCES auth.users,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

**3. BaseOff Table**
```sql
-- Lead database for prospecting
CREATE TABLE public.baseoff (
  -- Core fields for integration
  cpf TEXT,
  nome TEXT,
  telefone1 TEXT,
  telefone2 TEXT,
  telefone3 TEXT,
  banco TEXT,
  valor_beneficio TEXT,
  margem_disponivel TEXT,
  -- Additional fields...
);
```

**4. Commissions Table**
```sql
-- Commission tracking
CREATE TABLE public.commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  client_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  credit_value NUMERIC NOT NULL,
  commission_percentage NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  proposal_date DATE,
  payment_date DATE,
  payment_method TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

## 🗂️ Project Structure

```
credtz-app/
├── 📁 src/
│   ├── 📁 components/          # React components
│   ├── 📁 contexts/           # React contexts (Auth)
│   ├── 📁 hooks/             # Custom hooks
│   ├── 📁 integrations/      # Supabase integration
│   ├── 📁 pages/             # Page components
│   └── 📁 lib/               # Utilities
├── 📁 supabase/
│   ├── 📁 functions/         # Edge functions
│   └── 📁 migrations/        # Database migrations
├── 🐳 Dockerfile            # Multi-stage Docker build
├── 🐳 docker-compose.yml    # Production services
├── ⚙️ nginx.conf            # Nginx configuration
├── 🚀 deploy.sh             # Deployment script
└── 📄 .env.production       # Environment template
```

## 🚀 Deployment Commands

### Basic Commands
```bash
# Full deployment
./deploy.sh deploy

# Check system requirements
./deploy.sh check

# Create backup
./deploy.sh backup

# Show service status
./deploy.sh status

# View logs
./deploy.sh logs [service-name]

# Restart services
./deploy.sh restart

# Update from git
./deploy.sh update
```

### Docker Compose Commands
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f credtz-app

# Rebuild and restart
docker-compose up -d --build --force-recreate
```

## 🔐 Security Features

### Automatic SSL/TLS
- **Let's Encrypt**: Automatic certificate generation
- **Auto-renewal**: Certificates renewed automatically
- **HTTP to HTTPS**: Automatic redirection

### Security Headers
- **X-Frame-Options**: Clickjacking protection
- **X-XSS-Protection**: XSS attack prevention
- **X-Content-Type-Options**: MIME type sniffing protection
- **CSP**: Content Security Policy

### Rate Limiting
- **Application level**: Built into Supabase
- **Nginx level**: Request rate limiting
- **Redis caching**: Session and data caching

## 📊 Monitoring & Maintenance

### Health Checks
```bash
# Check application health
curl http://localhost:3000/health

# Check all services
docker-compose ps

# Monitor logs
docker-compose logs -f --tail=100
```

### Backup Strategy
```bash
# Manual backup
./deploy.sh backup

# Automatic backups (configured in docker-compose)
# - Daily at 2 AM via cron
# - Volume snapshots for persistence
```

### Performance Monitoring
- **Container stats**: `docker stats`
- **Nginx access logs**: `/var/log/nginx/access.log`
- **Application logs**: `docker-compose logs credtz-app`

## 🔧 Troubleshooting

### Common Issues

**1. SSL Certificate Issues**
```bash
# Check certificate status
docker-compose logs traefik

# Force certificate renewal
docker-compose restart traefik
```

**2. Database Connection Issues**
```bash
# Check Supabase connectivity
curl -I https://qwgsplcqyongfsqdjrme.supabase.co

# Verify environment variables
docker-compose exec credtz-app env | grep SUPABASE
```

**3. Application Not Starting**
```bash
# Check application logs
docker-compose logs credtz-app

# Verify build process
docker-compose build credtz-app --no-cache
```

**4. Performance Issues**
```bash
# Check resource usage
docker stats

# Monitor application performance
docker-compose exec credtz-app top
```

### Log Locations
- **Application**: `docker-compose logs credtz-app`
- **Nginx**: `docker-compose exec credtz-app cat /var/log/nginx/access.log`
- **Traefik**: `docker-compose logs traefik`

## 🔄 Updates & Maintenance

### Regular Updates
```bash
# Update from git repository
./deploy.sh update

# Manual update process
git pull
docker-compose build --no-cache
docker-compose up -d --force-recreate
```

### Database Migrations
```bash
# Run new migrations (if any)
supabase db push

# Or apply manually through Supabase dashboard
```

## 📱 Mobile Optimization

The application is optimized for mobile with:
- **Responsive design**: Mobile-first approach
- **Bottom navigation**: Mobile-friendly navigation
- **Touch optimized**: Proper touch targets
- **Performance**: Lazy loading and code splitting

## 🌐 Domain & DNS Configuration

### DNS Records
```
Type    Name    Value               TTL
A       @       YOUR_SERVER_IP      300
A       www     YOUR_SERVER_IP      300
CNAME   *       your-domain.com     300
```

### Subdomain Setup
```bash
# Edit .env for subdomain
DOMAIN=app.your-domain.com

# Redeploy
./deploy.sh deploy
```

## 📞 Support & Maintenance

### Regular Maintenance Tasks
- **Weekly**: Check logs and performance
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Review backup integrity
- **Annually**: SSL certificate verification (auto-renewed)

### Contact & Support
- **Documentation**: This guide
- **Logs**: Check application and system logs
- **Monitoring**: Set up alerting for critical issues

---

## 🎯 Production Checklist

Before going live, ensure:

- [ ] Domain configured and pointing to server
- [ ] SSL certificates working
- [ ] Supabase database configured with all tables
- [ ] Environment variables set correctly
- [ ] Backup strategy implemented
- [ ] Monitoring set up
- [ ] Security headers verified
- [ ] Performance testing completed
- [ ] Mobile responsiveness tested
- [ ] Error handling verified

**🎉 Your Credtz Lead Flow application is now ready for production!**
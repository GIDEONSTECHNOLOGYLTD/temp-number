# 📱 TempSMS Pro - Temporary Phone Number Service

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)
![Status](https://img.shields.io/badge/status-production--ready-success.svg)

A **modern, full-stack temporary phone number service** with real-time SMS reception, user authentication, payment integration, and a premium dark-themed UI. Built with Node.js, Express, Socket.IO, and SQLite.

## ✨ Features

### 🔥 Core Functionality
- **15+ Services**: WhatsApp, Telegram, Instagram, Facebook, Twitter, Google, Discord, TikTok, Snapchat, LinkedIn, Uber, Airbnb, Amazon, Microsoft, Apple ID
- **6+ Countries**: US, UK, Germany, France, Canada, Australia with realistic number pools
- **Real-time SMS**: WebSocket-powered instant delivery (3-15 second response)
- **Smart Code Extraction**: Automatic verification code parsing
- **User Authentication**: JWT-based auth with bcrypt password hashing
- **Payment System**: Multi-method payment integration (Card, PayPal, Crypto)
- **Balance Management**: User wallets with transaction history

### 🎨 Premium UI/UX
- **Modern Design**: Glass morphism effects with floating animations
- **Responsive**: Mobile-first design with touch-optimized interactions
- **Real-time Updates**: Live status indicators and progress animations
- **Toast Notifications**: Professional feedback system
- **Copy-to-Clipboard**: One-click number and code copying

### 🛡️ Enterprise Security
- **Rate Limiting**: Multi-tier protection (API: 1000/15min, Auth: 5/15min, SMS: 10/min)
- **Input Validation**: Express-validator with comprehensive sanitization
- **Security Headers**: Helmet.js with CSP, XSS protection
- **Error Handling**: Winston logging with structured error tracking
- **Health Monitoring**: Built-in health checks and metrics

### 🏗️ Production Architecture
- **WebSocket**: Real-time bidirectional communication
- **Database**: SQLite (dev) / PostgreSQL (prod) with proper schemas
- **Caching**: Redis integration for session management
- **Load Balancing**: Nginx reverse proxy with SSL termination
- **Containerization**: Docker + Docker Compose for easy deployment

## �️ Tech Stack

**Backend:**
- Node.js & Express.js
- Socket.IO (WebSocket)
- SQLite (development) / PostgreSQL (production)
- JWT Authentication
- Bcrypt password hashing
- Winston logging

**Frontend:**
- Vanilla JavaScript (ES6+)
- Modern CSS (Glass morphism, animations)
- Font Awesome icons
- Plus Jakarta Sans font

**Security & Performance:**
- Helmet.js security headers
- Express Rate Limiting
- CORS configuration
- Input validation & sanitization

## � Quick Start

### Prerequisites
- Node.js 16+ installed
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/GIDEONSTECHNOLOGYLTD/temp-number.git
cd temp-number
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env
```

Edit `.env` and set your configurations (especially `JWT_SECRET`)

4. **Start the development server**
```bash
npm start
# or for auto-reload during development
npm run dev
```

5. **Access the application**
```
http://localhost:3000
```

### First Time Setup

1. Navigate to `/app/create-account`
2. Create an account using email/password
3. Add funds to your account (demo mode for development)
4. Select a service and country
5. Get your temporary number
6. Receive SMS in real-time!

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user (requires token)

### User Management
- `GET /api/user/profile` - Get user profile
- `GET /api/user/balance` - Get account balance
- `GET /api/user/transactions` - Get transaction history
- `POST /api/user/add-funds` - Add funds to account

### Activations
- `POST /api/activations` - Request new number
- `GET /api/activations/:id` - Get activation details
- `POST /api/activations/:id/retry` - Retry SMS request
- `GET /api/activations` - List user activations

### Services & Countries
- `GET /api/services` - Get available services
- `GET /api/countries` - Get supported countries

### Example: Request Number
```javascript
const response = await fetch('/api/activations', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({
    serviceId: 'whatsapp',
    countryId: 'us'
  })
});

const { id, number, cost } = await response.json();
```

### Example: Real-time SMS via WebSocket
```javascript
const socket = io();
socket.emit('join-activation', activationId);
socket.on('sms-received', (data) => {
  console.log(`SMS: ${data.message}`);
  console.log(`Code: ${data.code}`);
});
```

## 📁 Project Structure

```
temp-number-service/
├── public/                 # Frontend files
│   ├── app.html           # Main dashboard
│   ├── create-account.html # Auth page
│   ├── funds.html         # Payment page
│   ├── app-script.js      # Main app logic
│   ├── auth-script.js     # Authentication logic
│   └── funds-script.js    # Payment logic
├── routes/                # API routes
│   ├── auth.js           # Authentication endpoints
│   ├── user.js           # User management
│   ├── activations.js    # Number activations
│   ├── services.js       # Service listings
│   └── webhooks.js       # SMS webhooks
├── database.js           # Database layer
├── sms-gateway.js        # SMS simulation/integration
├── server.js             # Express server
├── package.json          # Dependencies
├── .env.example          # Environment template
├── .gitignore           # Git ignore rules
├── README.md            # This file
└── DEPLOYMENT.md        # Deployment guide
```

## 🏭 Production Features

### SMS Gateway Integration
- **Twilio**: Enterprise SMS delivery with webhooks
- **Vonage**: Global SMS coverage with API integration
- **Webhook Endpoints**: `/api/webhooks/twilio`, `/api/webhooks/vonage`

### Monitoring & Logging
- **Winston**: Structured JSON logging with file rotation
- **Health Checks**: Docker health monitoring
- **Error Tracking**: Comprehensive error capture and reporting
- **Performance Metrics**: Request timing and success rates

### Scalability
- **Horizontal Scaling**: Load balancer ready
- **Database Pooling**: Connection management
- **Caching Layer**: Redis for session and rate limit storage
- **CDN Ready**: Static asset optimization

## 🔧 Configuration

### Environment Variables
```bash
# Core
NODE_ENV=production
PORT=3000

# Database
DB_HOST=localhost
DB_NAME=tempsms_prod
DB_USER=postgres
DB_PASSWORD=your_password

# SMS Providers
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
VONAGE_API_KEY=your_key

# Security
JWT_SECRET=your_jwt_secret
```

### Docker Deployment
```bash
docker-compose up -d
# Includes: App + PostgreSQL + Redis + Nginx
```

## 📊 Service Comparison

| Feature | TempSMS Pro | temp-number.org |
|---------|-------------|-----------------|
| Real-time Updates | ✅ WebSocket | ❌ Polling only |
| Service Coverage | 15+ services | 10+ services |
| UI/UX Quality | ✅ Premium | ⚠️ Basic |
| Production Ready | ✅ Full stack | ⚠️ Limited |
| API Documentation | ✅ Complete | ⚠️ Basic |
| Deployment | ✅ Docker | ❌ Manual |

## 🎯 Production Checklist

- ✅ Modern responsive UI with animations
- ✅ Real-time WebSocket communication
- ✅ Production-grade error handling
- ✅ Comprehensive logging system
- ✅ Docker containerization
- ✅ Nginx reverse proxy configuration
- ✅ Database migration scripts
- ✅ Health monitoring endpoints
- ✅ API documentation
- ✅ Security best practices

## 🚀 Deployment

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

**Quick Deploy Options:**
- **Development**: `npm start` (runs on http://localhost:3000)
- **Production VPS**: PM2 + Nginx + SSL (see DEPLOYMENT.md)
- **Heroku**: One-click deploy with environment variables
- **Vercel/Netlify**: Serverless deployment ready

## 🧪 Testing

**Test the full workflow:**
1. Create account at `/app/create-account`
2. Login with your credentials
3. Add funds (demo mode in development)
4. Select service (WhatsApp recommended)
5. Choose country (US has most numbers)
6. Click "Get Number"
7. Watch real-time SMS delivery (3-15 seconds)
8. Copy verification code automatically

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by services like temp-number.org
- UI design influenced by modern SaaS applications

## 📧 Contact & Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/GIDEONSTECHNOLOGYLTD/temp-number/issues)
- **Documentation**: Check this README and DEPLOYMENT.md
- **Email**: support@gideonstech.com

## 🔐 Security

If you discover a security vulnerability, please email security@gideonstech.com instead of using the issue tracker.

---

**Made with ❤️ by Gideon's Technology Ltd**

⭐ Star this repo if you find it useful!

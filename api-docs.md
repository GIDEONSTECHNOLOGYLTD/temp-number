# TempSMS Pro API Documentation

## Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Authentication
Most endpoints require API key authentication:
```
Authorization: Bearer YOUR_API_KEY
```

## Endpoints

### 1. Request Temporary Number
```http
POST /activations
Content-Type: application/json

{
  "serviceId": "whatsapp",
  "countryId": "us"
}
```

**Response:**
```json
{
  "id": "uuid-activation-id",
  "number": "+12025551001", 
  "status": "smsRequested",
  "expires_at": "2024-01-01T12:00:00Z"
}
```

### 2. Check SMS Status
```http
GET /activations/{activationId}
```

**Response:**
```json
{
  "id": "uuid-activation-id",
  "status": "smsReceived",
  "message": "Your WhatsApp code: 123456",
  "code": "123456",
  "number": "+12025551001",
  "service": "WhatsApp",
  "created_at": "2024-01-01T11:50:00Z",
  "expires_at": "2024-01-01T12:00:00Z"
}
```

### 3. Get Services & Pricing
```http
GET /services/pricelist
```

**Response:**
```json
[
  {
    "serviceId": "whatsapp",
    "serviceName": "WhatsApp", 
    "countries": [
      {
        "countryId": "us",
        "countryName": "United States",
        "price": 0.75,
        "available": true
      }
    ]
  }
]
```

### 4. User Balance
```http
GET /user/balance
```

**Response:**
```json
{
  "balance": 25.50,
  "currency": "USD"
}
```

### 5. Retry SMS
```http
POST /activations/{activationId}/retry
```

### 6. Activation History
```http
GET /activations
```

## WebSocket Events

Connect to `/socket.io` for real-time updates:

```javascript
const socket = io();

// Join activation room
socket.emit('join-activation', activationId);

// Listen for SMS
socket.on('sms-received', (data) => {
  console.log('SMS received:', data);
});
```

## Status Codes

- `smsRequested` - Waiting for SMS
- `smsReceived` - SMS received successfully  
- `retryRequested` - New SMS requested
- `expired` - Activation expired

## Error Handling

All errors return JSON:
```json
{
  "error": "Error message description"
}
```

## Rate Limits

- API: 1000 requests per 15 minutes
- Auth: 5 requests per 15 minutes
- SMS: 10 requests per minute

## Supported Services

Facebook, WhatsApp, Telegram, Instagram, Twitter, Google, Discord, TikTok, Snapchat, LinkedIn, Uber, Airbnb, Amazon, Microsoft, Apple ID

## Supported Countries

US, GB, DE, FR, CA, AU (more available on request)

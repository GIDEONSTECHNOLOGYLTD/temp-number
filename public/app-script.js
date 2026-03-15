class TempNumberApp {
    constructor() {
        this.socket = null;
        this.currentActivation = null;
        this.timer = null;
        this.countries = [
            { code: 'us', name: 'United States', price: '$0.50' },
            { code: 'gb', name: 'United Kingdom', price: '$0.45' },
            { code: 'ca', name: 'Canada', price: '$0.40' },
            { code: 'de', name: 'Germany', price: '$0.35' },
            { code: 'fr', name: 'France', price: '$0.35' },
            { code: 'it', name: 'Italy', price: '$0.30' },
            { code: 'es', name: 'Spain', price: '$0.30' },
            { code: 'nl', name: 'Netherlands', price: '$0.25' },
            { code: 'se', name: 'Sweden', price: '$0.25' },
            { code: 'no', name: 'Norway', price: '$0.25' },
            { code: 'dk', name: 'Denmark', price: '$0.25' },
            { code: 'fi', name: 'Finland', price: '$0.25' },
            { code: 'pl', name: 'Poland', price: '$0.20' },
            { code: 'cz', name: 'Czech Republic', price: '$0.20' },
            { code: 'hu', name: 'Hungary', price: '$0.20' },
            { code: 'ro', name: 'Romania', price: '$0.15' },
            { code: 'bg', name: 'Bulgaria', price: '$0.15' },
            { code: 'hr', name: 'Croatia', price: '$0.15' },
            { code: 'si', name: 'Slovenia', price: '$0.15' },
            { code: 'sk', name: 'Slovakia', price: '$0.15' }
        ];
        this.init();
    }

    async init() {
        this.renderCountries();
        this.setupEventListeners();
        this.setupWebSocket();
        await this.loadBalance();
    }

    renderCountries() {
        const grid = document.getElementById('countryGrid');
        grid.innerHTML = this.countries.map(country => `
            <div class="country-card" data-country="${country.code}" onclick="app.selectCountry('${country.code}')">
                <img src="https://flagcdn.com/w80/${country.code}.png" alt="${country.name}" class="country-flag">
                <div class="country-name">${country.name}</div>
                <div class="country-price">${country.price}</div>
            </div>
        `).join('');
    }

    setupEventListeners() {
        document.querySelectorAll('.service-card').forEach(card => {
            card.addEventListener('click', () => {
                const service = card.dataset.service;
                this.selectService(service);
            });
        });
    }

    setupWebSocket() {
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('Connected to WebSocket server');
        });

        this.socket.on('sms-received', (data) => {
            console.log('Received SMS:', data);
            if (this.currentActivation && this.currentActivation.id === data.id) {
                this.addSmsMessage({
                    from: data.service || 'Service',
                    message: data.message,
                    timestamp: data.timestamp
                });
                document.querySelector('.activation-status').textContent = 'SMS Received';
                document.querySelector('.activation-status').className = 'activation-status received';
                this.showToast('SMS received!', 'success');
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
        });
    }

    async loadBalance() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                // Redirect to login if no token
                window.location.href = '/app/create-account';
                return;
            }

            const response = await fetch('/api/user/balance', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/app/create-account';
                return;
            }

            const data = await response.json();
            document.querySelector('.balance-amount').textContent = `$${data.balance.toFixed(2)}`;
        } catch (error) {
            console.error('Error loading balance:', error);
            document.querySelector('.balance-amount').textContent = '$0.00';
        }
    }

    selectCountry(countryCode) {
        this.showLoading();
        
        setTimeout(() => {
            this.hideLoading();
            this.loadNumbers(countryCode);
        }, 1000);
    }

    selectService(service) {
        document.querySelectorAll('.service-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        document.querySelector(`[data-service="${service}"]`).classList.add('selected');
        this.selectedService = service;
        this.showToast(`Selected ${service}`, 'success');
    }

    loadNumbers(countryCode) {
        const country = this.countries.find(c => c.code === countryCode);
        const numbers = this.generateMockNumbers(countryCode, 5);
        
        const numberList = document.getElementById('numberList');
        numberList.innerHTML = numbers.map(number => `
            <div class="number-card" onclick="app.selectNumber('${number.number}', '${country.name}', '${country.price}')">
                <div class="number-display">
                    <img src="https://flagcdn.com/w40/${countryCode}.png" alt="${country.name}" class="country-flag" style="width: 32px; height: 24px;">
                    <div>
                        <div class="number-text">${number.number}</div>
                        <div class="number-country">${country.name}</div>
                    </div>
                </div>
                <div class="number-price">${country.price}</div>
            </div>
        `).join('');

        document.getElementById('numberSection').style.display = 'block';
        document.getElementById('numberSection').scrollIntoView({ behavior: 'smooth' });
    }

    generateMockNumbers(countryCode, count) {
        const numbers = [];
        const countryPrefixes = {
            'us': '+1',
            'gb': '+44',
            'ca': '+1',
            'de': '+49',
            'fr': '+33',
            'it': '+39',
            'es': '+34',
            'nl': '+31',
            'se': '+46',
            'no': '+47',
            'dk': '+45',
            'fi': '+358',
            'pl': '+48',
            'cz': '+420',
            'hu': '+36',
            'ro': '+40',
            'bg': '+359',
            'hr': '+385',
            'si': '+386',
            'sk': '+421'
        };

        const prefix = countryPrefixes[countryCode] || '+1';
        
        for (let i = 0; i < count; i++) {
            const randomNum = Math.floor(Math.random() * 900000000) + 100000000;
            numbers.push({
                number: `${prefix} ${randomNum.toString().replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}`
            });
        }
        
        return numbers;
    }

    async selectNumber(number, country, price) {
        if (!this.selectedService) {
            this.showToast('Please select a service first', 'error');
            return;
        }

        this.showLoading();

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/app/create-account';
                return;
            }

            const countryCode = this.countries.find(c => c.name === country)?.code || 'us';

            const response = await fetch('/api/activations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    serviceId: this.selectedService,
                    countryId: countryCode
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 402) {
                    this.showToast(`Insufficient balance. Need $${data.required}, have $${data.current}`, 'error');
                    setTimeout(() => {
                        window.location.href = '/app/funds';
                    }, 2000);
                    return;
                }
                throw new Error(data.error || 'Failed to activate number');
            }

            this.hideLoading();
            this.activateNumber(data);
            this.showToast(`Number activated: ${data.number}`, 'success');

        } catch (error) {
            this.hideLoading();
            this.showToast(error.message || 'Failed to activate number', 'error');
        }
    }

    activateNumber(data) {
        this.currentActivation = {
            id: data.id,
            number: data.number,
            status: data.status,
            startTime: Date.now(),
            duration: 20 * 60 * 1000 // 20 minutes
        };

        // Join WebSocket room for this activation
        if (this.socket) {
            this.socket.emit('join-activation', data.id);
        }

        document.getElementById('activationNumber').textContent = data.number;
        document.getElementById('activationSection').style.display = 'block';
        document.getElementById('numberSection').style.display = 'none';
        
        // Clear previous messages
        const messagesContainer = document.getElementById('activationMessages');
        messagesContainer.innerHTML = '<div class="no-messages">Waiting for SMS...</div>';
        
        this.startTimer();
        
        // Update balance display
        if (data.remaining_balance !== undefined) {
            document.querySelector('.balance-amount').textContent = `$${data.remaining_balance.toFixed(2)}`;
        }
    }

    startTimer() {
        if (this.timer) clearInterval(this.timer);
        
        this.timer = setInterval(() => {
            if (!this.currentActivation) return;
            
            const elapsed = Date.now() - this.currentActivation.startTime;
            const remaining = this.currentActivation.duration - elapsed;
            
            if (remaining <= 0) {
                this.expireActivation();
                return;
            }
            
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            document.getElementById('timerDisplay').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    simulateIncomingSMS() {
        const messages = [
            'Your verification code is: 123456',
            'WhatsApp code: 789012',
            'Telegram login code: 345678',
            'Your Google verification code is 901234',
            'Facebook security code: 567890'
        ];
        
        const senders = [
            'WhatsApp',
            'Telegram',
            'Google',
            'Facebook',
            'Instagram'
        ];
        
        const message = messages[Math.floor(Math.random() * messages.length)];
        const sender = senders[Math.floor(Math.random() * senders.length)];
        
        this.addSmsMessage({
            from: sender,
            message: message,
            timestamp: new Date().toISOString()
        });
        
        document.querySelector('.activation-status').textContent = 'SMS Received';
        document.querySelector('.activation-status').className = 'activation-status received';
    }

    addSmsMessage(data) {
        const messagesContainer = document.getElementById('activationMessages');
        const noMessages = messagesContainer.querySelector('.no-messages');
        if (noMessages) noMessages.remove();
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'sms-message';
        messageDiv.innerHTML = `
            <div class="sms-from">From: ${data.from}</div>
            <div class="sms-text">${data.message}</div>
        `;
        
        messagesContainer.appendChild(messageDiv);
    }

    expireActivation() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        this.showToast('Number expired', 'warning');
        document.getElementById('timerDisplay').textContent = '00:00';
        document.querySelector('.activation-status').textContent = 'Expired';
        document.querySelector('.activation-status').className = 'activation-status expired';
    }

    showLoading() {
        document.getElementById('loadingOverlay').classList.add('active');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('active');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-circle' : 
                    type === 'warning' ? 'exclamation-triangle' : 'info-circle';
        
        toast.innerHTML = `<i class="fas fa-${icon}"></i><span>${message}</span>`;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.5s ease forwards';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }
}

function cancelActivation() {
    if (app.currentActivation) {
        app.currentActivation = null;
        if (app.timer) {
            clearInterval(app.timer);
            app.timer = null;
        }
        document.getElementById('activationSection').style.display = 'none';
        document.getElementById('numberSection').style.display = 'block';
        app.showToast('Activation cancelled', 'warning');
    }
}

function getNewNumber() {
    if (app.currentActivation) {
        const country = app.countries.find(c => c.name === app.currentActivation.country);
        if (country) {
            cancelActivation();
            app.selectCountry(country.code);
        }
    }
}

// Initialize app
const app = new TempNumberApp();

// Add CSS for selected service
const style = document.createElement('style');
style.textContent = `
    .service-card.selected {
        border-color: var(--primary) !important;
        box-shadow: var(--shadow-md) !important;
        transform: translateY(-3px) !important;
    }
    
    .activation-status.expired {
        background: var(--error);
        color: white;
    }
    
    @keyframes slideOut {
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

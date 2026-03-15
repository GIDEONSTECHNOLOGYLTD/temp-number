document.addEventListener('DOMContentLoaded', () => {
    const phoneNumbersList = document.getElementById('phone-numbers-list');
    const smsMessagesList = document.getElementById('sms-messages-list');
    const loadingOverlay = document.getElementById('loading-overlay');
    const toastContainer = document.getElementById('toast-container');

    const socket = io();

    const showLoading = () => loadingOverlay.classList.add('show');
    const hideLoading = () => loadingOverlay.classList.remove('show');

    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.5s forwards';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    };

    const getCountryFlagUrl = (countryCode) => {
        if (!countryCode) return '';
        return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
    }

    const fetchPublicNumbers = async () => {
        try {
            showLoading();
            const response = await fetch('/api/public/numbers');
            if (!response.ok) throw new Error('Failed to fetch numbers');
            const numbers = await response.json();
            renderPhoneNumbers(numbers);
        } catch (error) {
            console.error('Error fetching public numbers:', error);
            showToast('Could not load public numbers.', 'error');
        } finally {
            hideLoading();
        }
    };

    const renderPhoneNumbers = (numbers) => {
        phoneNumbersList.innerHTML = '';
        if (numbers.length === 0) {
            phoneNumbersList.innerHTML = '<li class="no-numbers">No public numbers available.</li>';
            return;
        }
        numbers.forEach(number => {
            const li = document.createElement('li');
            li.className = 'number-card';
            li.dataset.number = number.number;
            li.innerHTML = `
                <img src="${getCountryFlagUrl(number.country_code)}" alt="${number.country_name}" class="country-flag">
                <div class="number-info">
                    <span class="phone-number">${number.number}</span>
                    <span class="country-name">${number.country_name}</span>
                </div>
                <span class="sms-count">0</span>
            `;
            phoneNumbersList.appendChild(li);
        });
    };

    const addSmsMessage = (sms) => {
        const item = document.createElement('li');
        item.className = 'sms-message-item';

        item.innerHTML = `
            <div class="sms-header">
                <span class="from"><i class="fas fa-user"></i> ${sms.from}</span>
                <span class="to"><i class="fas fa-mobile-alt"></i> ${sms.to}</span>
            </div>
            <p class="text">${sms.message}</p>
            <p class="time"><i class="far fa-clock"></i> ${new Date(sms.timestamp).toLocaleString()}</p>
        `;

        smsMessagesList.prepend(item);

        if (smsMessagesList.children.length > 50) {
            smsMessagesList.lastChild.remove();
        }
        
        // Update SMS count on the number card
        const numberCard = phoneNumbersList.querySelector(`[data-number="${sms.to}"]`);
        if (numberCard) {
            const countElement = numberCard.querySelector('.sms-count');
            const currentCount = parseInt(countElement.textContent, 10);
            countElement.textContent = currentCount + 1;
            
            // Highlight card
            numberCard.classList.add('new-sms');
            setTimeout(() => {
                numberCard.classList.remove('new-sms');
            }, 1000);
        }
    };

    socket.on('connect', () => {
        console.log('Connected to WebSocket server');
        showToast('Connected to real-time feed', 'success');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
        showToast('Disconnected from real-time feed', 'error');
    });

    socket.on('public-sms', (sms) => {
        addSmsMessage(sms);
        showToast(`New message for ${sms.to}`);
    });

    fetchPublicNumbers();
});


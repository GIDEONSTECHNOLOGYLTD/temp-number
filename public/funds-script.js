class FundsManager {
    constructor() {
        this.selectedMethod = 'card';
        this.selectedAmount = 25;
        this.customAmount = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateSummary();
    }

    setupEventListeners() {
        // Payment method selection
        document.querySelectorAll('.payment-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.payment-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                this.selectedMethod = card.dataset.method;
                this.updatePaymentForm();
            });
        });

        // Amount selection
        document.querySelectorAll('.amount-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.amount-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                
                const amount = card.dataset.amount;
                if (amount === 'custom') {
                    this.selectedAmount = null;
                    card.querySelector('.custom-amount').focus();
                } else {
                    this.selectedAmount = parseInt(amount);
                    this.customAmount = null;
                }
                this.updateSummary();
            });
        });

        // Custom amount input
        const customInput = document.querySelector('.custom-amount');
        customInput.addEventListener('input', (e) => {
            this.customAmount = parseFloat(e.target.value) || 0;
            if (this.customAmount > 0) {
                this.selectedAmount = null;
                this.updateSummary();
            }
        });

        // Form inputs formatting
        this.setupFormFormatting();

        // Form submission
        document.getElementById('paymentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.processPayment();
        });
    }

    setupFormFormatting() {
        // Card number formatting
        document.getElementById('cardNumber').addEventListener('input', (e) => {
            let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formattedValue;
        });

        // Expiry date formatting
        document.getElementById('expiryDate').addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });

        // CVV formatting
        document.getElementById('cvv').addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    }

    updatePaymentForm() {
        const form = document.querySelector('.payment-details');
        
        if (this.selectedMethod === 'paypal') {
            form.innerHTML = `
                <div class="paypal-info">
                    <i class="fab fa-paypal" style="font-size: 48px; color: #0070ba; margin-bottom: 16px;"></i>
                    <p>You will be redirected to PayPal to complete your payment securely.</p>
                </div>
                <button type="submit" class="pay-button">
                    <i class="fab fa-paypal"></i>
                    Continue with PayPal
                </button>
            `;
        } else if (this.selectedMethod === 'crypto') {
            form.innerHTML = `
                <div class="crypto-info">
                    <i class="fab fa-bitcoin" style="font-size: 48px; color: #f7931a; margin-bottom: 16px;"></i>
                    <p>Select your preferred cryptocurrency:</p>
                    <div class="crypto-options">
                        <label class="crypto-option">
                            <input type="radio" name="crypto" value="bitcoin" checked>
                            <i class="fab fa-bitcoin"></i> Bitcoin
                        </label>
                        <label class="crypto-option">
                            <input type="radio" name="crypto" value="ethereum">
                            <i class="fab fa-ethereum"></i> Ethereum
                        </label>
                    </div>
                </div>
                <button type="submit" class="pay-button">
                    <i class="fab fa-bitcoin"></i>
                    Pay with Crypto
                </button>
            `;
        } else {
            form.innerHTML = `
                <div class="form-group">
                    <label for="cardNumber">Card Number</label>
                    <input type="text" id="cardNumber" placeholder="1234 5678 9012 3456" maxlength="19" required>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="expiryDate">Expiry Date</label>
                        <input type="text" id="expiryDate" placeholder="MM/YY" maxlength="5" required>
                    </div>
                    <div class="form-group">
                        <label for="cvv">CVV</label>
                        <input type="text" id="cvv" placeholder="123" maxlength="4" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="cardName">Cardholder Name</label>
                    <input type="text" id="cardName" placeholder="John Doe" required>
                </div>
                
                <button type="submit" class="pay-button">
                    <i class="fas fa-lock"></i>
                    Pay Securely
                </button>
            `;
            this.setupFormFormatting();
        }
    }

    updateSummary() {
        const amount = this.customAmount || this.selectedAmount || 0;
        const bonus = this.calculateBonus(amount);
        const total = amount + bonus;

        document.getElementById('summaryAmount').textContent = `$${amount.toFixed(2)}`;
        document.getElementById('summaryBonus').textContent = `+$${bonus.toFixed(2)}`;
        document.getElementById('summaryTotal').textContent = `$${total.toFixed(2)}`;
    }

    calculateBonus(amount) {
        if (amount >= 100) return amount * 0.2;
        if (amount >= 50) return amount * 0.15;
        if (amount >= 25) return amount * 0.12;
        if (amount >= 10) return amount * 0.1;
        if (amount >= 5) return amount * 0.1;
        return 0;
    }

    async processPayment() {
        const amount = this.selectedAmount || this.customAmount;
        if (!amount || amount < 5) {
            this.showToast('Minimum amount is $5', 'error');
            return;
        }

        this.showLoading();

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/app/create-account';
                return;
            }

            const response = await fetch('/api/user/add-funds', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: amount,
                    paymentMethod: this.selectedMethod
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Payment failed');
            }

            this.hideLoading();
            this.showToast(`Added $${amount} to your balance!`, 'success');

            
            // Redirect back to app after success
            setTimeout(() => {
                window.location.href = '/app';
            }, 2000);
            
        } catch (error) {
            this.hideLoading();
            this.showToast('Payment failed. Please try again.', 'error');
        }
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

// Initialize funds manager
const fundsManager = new FundsManager();

// Add additional CSS
const style = document.createElement('style');
style.textContent = `
    .funds-container {
        display: grid;
        grid-template-columns: 1fr 400px;
        gap: 40px;
        max-width: 1200px;
        margin: 0 auto;
    }
    
    .payment-title {
        font-size: 20px;
        font-weight: 600;
        color: white;
        margin-bottom: 24px;
    }
    
    .payment-grid {
        display: grid;
        gap: 16px;
        margin-bottom: 40px;
    }
    
    .payment-card {
        background: rgba(255, 255, 255, 0.9);
        border: 2px solid var(--gray-200);
        border-radius: var(--radius-xl);
        padding: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 16px;
    }
    
    .payment-card:hover {
        border-color: var(--primary);
        transform: translateY(-2px);
    }
    
    .payment-card.active {
        border-color: var(--primary);
        box-shadow: var(--shadow-md);
    }
    
    .payment-icon {
        width: 48px;
        height: 48px;
        background: var(--gray-100);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        color: var(--primary);
    }
    
    .payment-name {
        font-weight: 600;
        color: var(--gray-800);
        flex-grow: 1;
    }
    
    .payment-logos {
        display: flex;
        gap: 8px;
        font-size: 20px;
        color: var(--gray-600);
    }
    
    .amount-title {
        font-size: 18px;
        font-weight: 600;
        color: white;
        margin-bottom: 20px;
    }
    
    .amount-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
    }
    
    .amount-card {
        background: rgba(255, 255, 255, 0.9);
        border: 2px solid var(--gray-200);
        border-radius: var(--radius-lg);
        padding: 16px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .amount-card:hover {
        border-color: var(--primary);
    }
    
    .amount-card.active {
        border-color: var(--primary);
        box-shadow: var(--shadow-sm);
    }
    
    .amount-value {
        display: block;
        font-size: 18px;
        font-weight: 700;
        color: var(--gray-800);
        margin-bottom: 4px;
    }
    
    .amount-bonus {
        font-size: 12px;
        color: var(--success);
        font-weight: 500;
    }
    
    .custom-amount {
        width: 100%;
        border: none;
        background: transparent;
        font-size: 14px;
        text-align: center;
        outline: none;
        margin-top: 8px;
    }
    
    .form-card {
        background: rgba(255, 255, 255, 0.95);
        border-radius: var(--radius-2xl);
        padding: 32px;
        position: sticky;
        top: 100px;
    }
    
    .form-title {
        font-size: 20px;
        font-weight: 700;
        color: var(--gray-800);
        margin-bottom: 24px;
    }
    
    .payment-summary {
        background: var(--gray-50);
        border-radius: var(--radius-lg);
        padding: 20px;
        margin-bottom: 24px;
    }
    
    .summary-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 14px;
        color: var(--gray-600);
    }
    
    .summary-row.total {
        border-top: 1px solid var(--gray-200);
        padding-top: 12px;
        margin-top: 12px;
        font-weight: 700;
        font-size: 16px;
        color: var(--gray-800);
    }
    
    .form-group {
        margin-bottom: 20px;
    }
    
    .form-group label {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: var(--gray-700);
        margin-bottom: 8px;
    }
    
    .form-group input {
        width: 100%;
        padding: 12px 16px;
        border: 1px solid var(--gray-300);
        border-radius: var(--radius-md);
        font-size: 16px;
        transition: border-color 0.3s ease;
    }
    
    .form-group input:focus {
        outline: none;
        border-color: var(--primary);
    }
    
    .form-row {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 16px;
    }
    
    .pay-button {
        width: 100%;
        background: linear-gradient(135deg, var(--primary), var(--secondary));
        color: white;
        border: none;
        padding: 16px 24px;
        border-radius: var(--radius-lg);
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }
    
    .pay-button:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg);
    }
    
    .paypal-info, .crypto-info {
        text-align: center;
        padding: 40px 20px;
        color: var(--gray-600);
    }
    
    .crypto-options {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 20px;
    }
    
    .crypto-option {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border: 1px solid var(--gray-200);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: border-color 0.3s ease;
    }
    
    .crypto-option:hover {
        border-color: var(--primary);
    }
    
    @media (max-width: 768px) {
        .funds-container {
            grid-template-columns: 1fr;
            gap: 20px;
        }
        
        .amount-grid {
            grid-template-columns: 1fr;
        }
        
        .form-card {
            position: static;
        }
    }
`;
document.head.appendChild(style);

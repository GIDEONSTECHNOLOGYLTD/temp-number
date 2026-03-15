class AuthManager {
    constructor() {
        this.currentTab = 'email';
        this.isLoginMode = false;
        this.init();
    }

    init() {
        this.setupTabSwitching();
        this.setupFormValidation();
        this.setupPasswordStrength();
        this.setupModeToggle();
    }

    setupModeToggle() {
        const toggleBtn = document.getElementById('toggleMode');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.isLoginMode = !this.isLoginMode;
                this.updateFormMode();
            });
        }
    }

    updateFormMode() {
        const formTitle = document.querySelector('.form-title');
        const formSubtitle = document.querySelector('.form-subtitle');
        const toggleBtn = document.getElementById('toggleMode');
        const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
        const submitBtn = document.querySelector('.submit-btn');
        
        if (this.isLoginMode) {
            formTitle.textContent = 'Welcome Back';
            formSubtitle.textContent = 'Sign in to your account to continue';
            toggleBtn.innerHTML = 'Don\'t have an account? <span>Sign up</span>';
            if (confirmPasswordGroup) confirmPasswordGroup.style.display = 'none';
            if (submitBtn) submitBtn.textContent = 'Sign In';
        } else {
            formTitle.textContent = 'Create Account';
            formSubtitle.textContent = 'Join thousands using temporary phone numbers';
            toggleBtn.innerHTML = 'Already have an account? <span>Sign in</span>';
            if (confirmPasswordGroup) confirmPasswordGroup.style.display = 'block';
            if (submitBtn) submitBtn.textContent = 'Create Account';
        }
    }

    setupTabSwitching() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });
    }

    switchTab(tab) {
        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tab}-tab`).classList.add('active');

        this.currentTab = tab;
    }

    setupFormValidation() {
        // Email form
        document.getElementById('emailForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEmailSignup();
        });

        // Phone form
        document.getElementById('phoneForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePhoneSignup();
        });

        // Real-time validation
        document.getElementById('confirmPassword').addEventListener('input', (e) => {
            this.validatePasswordMatch();
        });

        document.getElementById('email').addEventListener('input', (e) => {
            this.validateEmail(e.target.value);
        });
    }

    setupPasswordStrength() {
        document.getElementById('password').addEventListener('input', (e) => {
            this.checkPasswordStrength(e.target.value);
        });
    }

    checkPasswordStrength(password) {
        const strengthEl = document.getElementById('passwordStrength');
        const criteria = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        const score = Object.values(criteria).filter(Boolean).length;
        let strength = '';
        let color = '';

        if (score < 2) {
            strength = 'Weak';
            color = '#ef4444';
        } else if (score < 4) {
            strength = 'Medium';
            color = '#f59e0b';
        } else {
            strength = 'Strong';
            color = '#10b981';
        }

        strengthEl.innerHTML = `
            <div class="strength-bar">
                <div class="strength-fill" style="width: ${(score / 5) * 100}%; background: ${color};"></div>
            </div>
            <span class="strength-text" style="color: ${color};">${strength}</span>
        `;
    }

    validatePasswordMatch() {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const confirmEl = document.getElementById('confirmPassword');

        if (confirmPassword && password !== confirmPassword) {
            confirmEl.setCustomValidity('Passwords do not match');
            confirmEl.style.borderColor = '#ef4444';
        } else {
            confirmEl.setCustomValidity('');
            confirmEl.style.borderColor = '#d1d5db';
        }
    }

    validateEmail(email) {
        const emailEl = document.getElementById('email');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (email && !emailRegex.test(email)) {
            emailEl.style.borderColor = '#ef4444';
        } else {
            emailEl.style.borderColor = '#d1d5db';
        }
    }

    async handleEmailSignup() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const terms = document.getElementById('terms').checked;

        if (this.isLoginMode) {
            // Login mode - only validate email and password
            if (!email || !password) {
                this.showToast('Please enter email and password', 'error');
                return;
            }
            await this.handleLogin(email, password);
        } else {
            // Signup mode - validate all fields
            if (!this.validateForm({ email, password, confirmPassword, terms })) {
                return;
            }
            await this.handleRegister(email, password);
        }
    }

    async handleLogin(email, password) {
        this.showLoading();

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            this.hideLoading();
            this.showToast('Welcome back!', 'success');

            setTimeout(() => {
                window.location.href = '/app';
            }, 1000);

        } catch (error) {
            this.hideLoading();
            this.showToast(error.message || 'Invalid credentials', 'error');
        }
    }

    async handleRegister(email, password) {
        this.showLoading();

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password,
                    name: email.split('@')[0]
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            this.hideLoading();
            this.showToast('Account created successfully! Welcome!', 'success');

            setTimeout(() => {
                window.location.href = '/app';
            }, 1500);

        } catch (error) {
            this.hideLoading();
            this.showToast(error.message || 'Failed to create account', 'error');
        }
    }

    async handlePhoneSignup() {
        const countryCode = document.getElementById('countryCode').value;
        const phoneNumber = document.getElementById('phoneNumber').value;
        const password = document.getElementById('phonePassword').value;
        const terms = document.getElementById('phoneTerms').checked;

        if (!this.validatePhoneForm({ countryCode, phoneNumber, password, terms })) {
            return;
        }

        this.showLoading();

        try {
            // Simulate sending verification code
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.hideLoading();
            this.showVerificationModal(countryCode + phoneNumber);
            
        } catch (error) {
            this.hideLoading();
            this.showToast('Failed to send verification code. Please try again.', 'error');
        }
    }

    validateForm({ email, password, confirmPassword, terms }) {
        if (!email || !password || !confirmPassword || !terms) {
            this.showToast('Please fill in all required fields', 'error');
            return false;
        }

        if (password !== confirmPassword) {
            this.showToast('Passwords do not match', 'error');
            return false;
        }

        if (password.length < 8) {
            this.showToast('Password must be at least 8 characters long', 'error');
            return false;
        }

        return true;
    }

    validatePhoneForm({ countryCode, phoneNumber, password, terms }) {
        if (!countryCode || !phoneNumber || !password || !terms) {
            this.showToast('Please fill in all required fields', 'error');
            return false;
        }

        if (password.length < 8) {
            this.showToast('Password must be at least 8 characters long', 'error');
            return false;
        }

        return true;
    }

    showVerificationModal(phoneNumber) {
        const modal = document.createElement('div');
        modal.className = 'verification-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Verify Your Phone Number</h3>
                <p>We've sent a verification code to ${phoneNumber}</p>
                <div class="verification-input">
                    <input type="text" id="verificationCode" placeholder="Enter 6-digit code" maxlength="6">
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="this.closest('.verification-modal').remove()">Cancel</button>
                    <button class="btn-primary" onclick="authManager.verifyCode()">Verify</button>
                </div>
                <p class="resend-text">Didn't receive the code? <a href="#" class="link" onclick="authManager.resendCode()">Resend</a></p>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.getElementById('verificationCode').focus();
    }

    async verifyCode() {
        const code = document.getElementById('verificationCode').value;
        
        if (code.length !== 6) {
            this.showToast('Please enter a 6-digit code', 'error');
            return;
        }

        try {
            // Simulate verification
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            document.querySelector('.verification-modal').remove();
            this.showToast('Phone number verified! Account created successfully!', 'success');
            
            setTimeout(() => {
                window.location.href = '/app';
            }, 1500);
            
        } catch (error) {
            this.showToast('Invalid verification code', 'error');
        }
    }

    async resendCode() {
        this.showToast('Verification code sent!', 'success');
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

// Social login functions
function signUpWithGoogle() {
    authManager.showLoading();
    setTimeout(() => {
        authManager.hideLoading();
        authManager.showToast('Google signup successful!', 'success');
        setTimeout(() => window.location.href = '/app', 1500);
    }, 2000);
}

function signUpWithFacebook() {
    authManager.showLoading();
    setTimeout(() => {
        authManager.hideLoading();
        authManager.showToast('Facebook signup successful!', 'success');
        setTimeout(() => window.location.href = '/app', 1500);
    }, 2000);
}

function signUpWithTwitter() {
    authManager.showLoading();
    setTimeout(() => {
        authManager.hideLoading();
        authManager.showToast('Twitter signup successful!', 'success');
        setTimeout(() => window.location.href = '/app', 1500);
    }, 2000);
}

function signUpWithGithub() {
    authManager.showLoading();
    setTimeout(() => {
        authManager.hideLoading();
        authManager.showToast('GitHub signup successful!', 'success');
        setTimeout(() => window.location.href = '/app', 1500);
    }, 2000);
}

// Initialize auth manager
const authManager = new AuthManager();

// Add additional CSS for auth page
const style = document.createElement('style');
style.textContent = `
    .auth-container {
        display: grid;
        grid-template-columns: 1fr 400px;
        gap: 60px;
        max-width: 1200px;
        margin: 0 auto;
        padding: 40px 24px;
        min-height: calc(100vh - 80px);
        align-items: start;
    }
    
    .auth-card {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: var(--radius-2xl);
        padding: 40px;
        box-shadow: var(--shadow-xl);
    }
    
    .auth-header {
        text-align: center;
        margin-bottom: 32px;
    }
    
    .auth-header h1 {
        font-size: 28px;
        font-weight: 700;
        color: var(--gray-900);
        margin-bottom: 8px;
    }
    
    .auth-header p {
        color: var(--gray-600);
        font-size: 16px;
    }
    
    .auth-tabs {
        display: flex;
        background: var(--gray-100);
        border-radius: var(--radius-lg);
        padding: 4px;
        margin-bottom: 32px;
    }
    
    .tab-btn {
        flex: 1;
        background: transparent;
        border: none;
        padding: 12px 16px;
        border-radius: var(--radius-md);
        font-weight: 500;
        color: var(--gray-600);
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }
    
    .tab-btn.active {
        background: white;
        color: var(--primary);
        box-shadow: var(--shadow-sm);
    }
    
    .tab-content {
        display: none;
    }
    
    .tab-content.active {
        display: block;
    }
    
    .auth-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }
    
    .form-group label {
        display: block;
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
    
    .phone-input {
        display: flex;
        gap: 12px;
    }
    
    .country-select {
        width: 120px;
        padding: 12px 16px;
        border: 1px solid var(--gray-300);
        border-radius: var(--radius-md);
        font-size: 16px;
    }
    
    .password-strength {
        margin-top: 8px;
    }
    
    .strength-bar {
        width: 100%;
        height: 4px;
        background: var(--gray-200);
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 4px;
    }
    
    .strength-fill {
        height: 100%;
        transition: width 0.3s ease;
    }
    
    .strength-text {
        font-size: 12px;
        font-weight: 500;
    }
    
    .checkbox-label {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        cursor: pointer;
        font-size: 14px;
        color: var(--gray-600);
    }
    
    .checkbox-label input[type="checkbox"] {
        width: auto;
        margin: 0;
    }
    
    .auth-btn {
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
    
    .auth-btn:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg);
    }
    
    .social-buttons {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    
    .social-btn {
        width: 100%;
        padding: 12px 24px;
        border: 1px solid var(--gray-300);
        border-radius: var(--radius-lg);
        background: white;
        color: var(--gray-700);
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
    }
    
    .social-btn:hover {
        border-color: var(--primary);
        transform: translateY(-1px);
    }
    
    .social-btn.google:hover { border-color: #ea4335; }
    .social-btn.facebook:hover { border-color: #1877f2; }
    .social-btn.twitter:hover { border-color: #1da1f2; }
    .social-btn.github:hover { border-color: #333; }
    
    .social-terms {
        margin-top: 20px;
        text-align: center;
        font-size: 12px;
        color: var(--gray-500);
    }
    
    .auth-footer {
        text-align: center;
        margin-top: 32px;
        padding-top: 24px;
        border-top: 1px solid var(--gray-200);
        color: var(--gray-600);
    }
    
    .link {
        color: var(--primary);
        text-decoration: none;
        font-weight: 500;
    }
    
    .link:hover {
        text-decoration: underline;
    }
    
    .features-sidebar {
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(10px);
        border-radius: var(--radius-2xl);
        padding: 32px;
        box-shadow: var(--shadow-lg);
        position: sticky;
        top: 100px;
    }
    
    .features-sidebar h3 {
        font-size: 20px;
        font-weight: 700;
        color: var(--gray-900);
        margin-bottom: 24px;
    }
    
    .feature-list {
        display: flex;
        flex-direction: column;
        gap: 24px;
    }
    
    .feature-item {
        display: flex;
        gap: 16px;
    }
    
    .feature-icon {
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, var(--primary), var(--secondary));
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 20px;
        flex-shrink: 0;
    }
    
    .feature-content h4 {
        font-size: 16px;
        font-weight: 600;
        color: var(--gray-900);
        margin-bottom: 4px;
    }
    
    .feature-content p {
        font-size: 14px;
        color: var(--gray-600);
        line-height: 1.5;
    }
    
    .verification-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
    }
    
    .modal-content {
        background: white;
        border-radius: var(--radius-2xl);
        padding: 32px;
        max-width: 400px;
        width: 90%;
        text-align: center;
    }
    
    .modal-content h3 {
        font-size: 20px;
        font-weight: 700;
        color: var(--gray-900);
        margin-bottom: 12px;
    }
    
    .verification-input {
        margin: 24px 0;
    }
    
    .verification-input input {
        width: 100%;
        padding: 16px;
        font-size: 24px;
        text-align: center;
        letter-spacing: 8px;
        border: 2px solid var(--gray-300);
        border-radius: var(--radius-lg);
    }
    
    .modal-actions {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
    }
    
    .btn-primary, .btn-secondary {
        flex: 1;
        padding: 12px 24px;
        border-radius: var(--radius-lg);
        font-weight: 600;
        cursor: pointer;
        border: none;
    }
    
    .btn-primary {
        background: var(--primary);
        color: white;
    }
    
    .btn-secondary {
        background: var(--gray-200);
        color: var(--gray-700);
    }
    
    .resend-text {
        font-size: 14px;
        color: var(--gray-600);
    }
    
    @media (max-width: 768px) {
        .auth-container {
            grid-template-columns: 1fr;
            gap: 20px;
        }
        
        .auth-card, .features-sidebar {
            padding: 24px;
        }
        
        .features-sidebar {
            position: static;
        }
    }
`;
document.head.appendChild(style);

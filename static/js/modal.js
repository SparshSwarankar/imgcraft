// ============================================================================
// MODAL SYSTEM FOR IMGCRAFT
// ============================================================================

class ModalManager {
    constructor() {
        this.overlay = document.getElementById('modal-overlay');
        this.container = this.overlay?.querySelector('.modal-container');
        this.content = document.getElementById('modalContent');
        this.closeBtn = document.getElementById('modalClose');

        this.init();
    }

    init() {
        if (!this.overlay || !this.content) {
            console.warn('Modal elements not found');
            return;
        }

        // Close button click
        this.closeBtn?.addEventListener('click', () => this.close());

        // Overlay click (outside modal)
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.classList.contains('active')) {
                this.close();
            }
        });

        // Prevent body scroll when modal is open
        this.overlay.addEventListener('transitionend', () => {
            if (this.overlay.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });

        // Initialize modal triggers
        this.initTriggers();
    }

    initTriggers() {
        // Find all elements with data-modal attribute
        const triggers = document.querySelectorAll('[data-modal]');

        triggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                const modalType = trigger.getAttribute('data-modal');
                this.open(modalType);
            });
        });
    }

    open(type) {
        const content = this.getModalContent(type);

        if (content) {
            this.content.innerHTML = content;
            this.overlay.classList.add('active');

            // Initialize any forms in the modal
            if (type === 'contact') {
                this.initContactForm();
            }
        }
    }

    close() {
        this.overlay.classList.remove('active');

        // Clear content after animation
        setTimeout(() => {
            this.content.innerHTML = '';
        }, 300);
    }

    getModalContent(type) {
        const contents = {
            privacy: this.getPrivacyPolicy(),
            terms: this.getTermsConditions(),
            refunds: this.getRefundsPolicy(),
            contact: this.getContactForm()
        };

        return contents[type] || '<p>Content not found</p>';
    }

    getPrivacyPolicy() {
        return `
            <div class="modal-header">
                <h2><i class="fas fa-shield-alt"></i> Privacy Policy</h2>
            </div>
            <div class="modal-body scrollable">
                <div class="policy-section">
                    <h3>1. Information We Collect</h3>
                    <p>At ImgCraft, we are committed to protecting your privacy. We collect minimal information necessary to provide our services:</p>
                    <ul>
                        <li><strong>Account Information:</strong> Email address and authentication credentials when you create an account</li>
                        <li><strong>Payment Information:</strong> Processed securely through Razorpay (we do not store credit card details)</li>
                        <li><strong>Usage Data:</strong> Credit usage, tool interactions, and service analytics</li>
                        <li><strong>Technical Data:</strong> IP address, browser type, and device information for security and optimization</li>
                    </ul>
                </div>

                <div class="policy-section">
                    <h3>2. How We Use Your Information</h3>
                    <p>Your information is used exclusively for:</p>
                    <ul>
                        <li>Providing and improving our image processing services</li>
                        <li>Managing your account and credit balance</li>
                        <li>Processing payments and maintaining transaction records</li>
                        <li>Sending important service updates and notifications</li>
                        <li>Ensuring platform security and preventing fraud</li>
                    </ul>
                </div>

                <div class="policy-section">
                    <h3>3. Image Processing & Privacy</h3>
                    <p><strong>Your images are private and secure:</strong></p>
                    <ul>
                        <li>Most tools process images entirely in your browser (client-side)</li>
                        <li>Server-side processing (AI tools) happens in real-time with no permanent storage</li>
                        <li>Uploaded images are automatically deleted after processing</li>
                        <li>We never use your images for training AI models or any other purpose</li>
                        <li>All data transmission is encrypted using HTTPS/TLS</li>
                    </ul>
                </div>

                <div class="policy-section">
                    <h3>4. Data Sharing & Third Parties</h3>
                    <p>We do not sell, rent, or share your personal information with third parties, except:</p>
                    <ul>
                        <li><strong>Payment Processing:</strong> Razorpay for secure payment transactions</li>
                        <li><strong>Authentication:</strong> Supabase for secure user authentication</li>
                        <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                    </ul>
                </div>

                <div class="policy-section">
                    <h3>5. Cookies & Tracking</h3>
                    <p>We use essential cookies for:</p>
                    <ul>
                        <li>Maintaining your login session</li>
                        <li>Remembering your preferences</li>
                        <li>Analytics to improve our services (anonymized data)</li>
                    </ul>
                    <p>You can control cookies through your browser settings.</p>
                </div>

                <div class="policy-section">
                    <h3>6. Data Security</h3>
                    <p>We implement industry-standard security measures:</p>
                    <ul>
                        <li>Encrypted data transmission (HTTPS/TLS)</li>
                        <li>Secure authentication with Supabase</li>
                        <li>Regular security audits and updates</li>
                        <li>Minimal data retention policies</li>
                    </ul>
                </div>

                <div class="policy-section">
                    <h3>7. Your Rights</h3>
                    <p>You have the right to:</p>
                    <ul>
                        <li>Access your personal data</li>
                        <li>Request data correction or deletion</li>
                        <li>Export your data</li>
                        <li>Withdraw consent at any time</li>
                        <li>Lodge a complaint with data protection authorities</li>
                    </ul>
                </div>

                <div class="policy-section">
                    <h3>8. Children's Privacy</h3>
                    <p>ImgCraft is not intended for users under 13 years of age. We do not knowingly collect information from children.</p>
                </div>

                <div class="policy-section">
                    <h3>9. Changes to This Policy</h3>
                    <p>We may update this privacy policy periodically. Significant changes will be communicated via email or platform notifications.</p>
                </div>

                <div class="policy-section">
                    <h3>10. Contact Us</h3>
                    <p>For privacy-related questions or concerns, please contact us through our Contact form or email us directly.</p>
                    <p class="policy-updated">Last Updated: December 2024</p>
                </div>
            </div>
        `;
    }

    getTermsConditions() {
        return `
            <div class="modal-header">
                <h2><i class="fas fa-file-contract"></i> Terms & Conditions</h2>
            </div>
            <div class="modal-body scrollable">
                <div class="policy-section">
                    <h3>1. Acceptance of Terms</h3>
                    <p>By accessing and using ImgCraft ("the Service"), you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.</p>
                </div>

                <div class="policy-section">
                    <h3>2. Service Description</h3>
                    <p>ImgCraft provides online image processing tools including but not limited to:</p>
                    <ul>
                        <li>Image resizing, compression, and format conversion</li>
                        <li>AI-powered background removal and image upscaling</li>
                        <li>Filters, effects, and image enhancement tools</li>
                        <li>Watermarking and collage creation</li>
                    </ul>
                    <p>Services are provided on a credit-based system with both free and paid tiers.</p>
                </div>

                <div class="policy-section">
                    <h3>3. User Accounts</h3>
                    <ul>
                        <li>You must be at least 13 years old to create an account</li>
                        <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                        <li>You are responsible for all activities under your account</li>
                        <li>You must provide accurate and complete information</li>
                        <li>One account per user; multiple accounts may be terminated</li>
                    </ul>
                </div>

                <div class="policy-section">
                    <h3>4. Credit System & Payments</h3>
                    <ul>
                        <li>Credits are virtual currency used to access premium features</li>
                        <li>Credits are non-transferable and have no cash value</li>
                        <li>Free credits may be provided at our discretion</li>
                        <li>Purchased credits do not expire unless otherwise stated</li>
                        <li>All payments are processed securely through Razorpay</li>
                        <li>Prices are subject to change with notice</li>
                    </ul>
                </div>

                <div class="policy-section">
                    <h3>5. Acceptable Use Policy</h3>
                    <p><strong>You agree NOT to:</strong></p>
                    <ul>
                        <li>Upload illegal, harmful, or offensive content</li>
                        <li>Violate intellectual property rights of others</li>
                        <li>Attempt to reverse engineer or exploit the service</li>
                        <li>Use automated systems to abuse the service</li>
                        <li>Upload malware, viruses, or malicious code</li>
                        <li>Impersonate others or provide false information</li>
                        <li>Interfere with the service's operation or security</li>
                    </ul>
                </div>

                <div class="policy-section">
                    <h3>6. Intellectual Property</h3>
                    <ul>
                        <li><strong>Your Content:</strong> You retain all rights to images you upload</li>
                        <li><strong>Our Platform:</strong> ImgCraft's code, design, and branding are protected by copyright</li>
                        <li><strong>License:</strong> You grant us a temporary license to process your images solely for providing the service</li>
                        <li><strong>Processed Images:</strong> You own all rights to images processed by our tools</li>
                    </ul>
                </div>

                <div class="policy-section">
                    <h3>7. Service Availability</h3>
                    <ul>
                        <li>We strive for 99.9% uptime but do not guarantee uninterrupted service</li>
                        <li>Maintenance windows may be scheduled with advance notice</li>
                        <li>We reserve the right to modify or discontinue features</li>
                        <li>Emergency maintenance may occur without notice</li>
                    </ul>
                </div>

                <div class="policy-section">
                    <h3>8. Limitation of Liability</h3>
                    <p>ImgCraft is provided "as is" without warranties of any kind. We are not liable for:</p>
                    <ul>
                        <li>Loss of data or images (always keep backups)</li>
                        <li>Service interruptions or errors</li>
                        <li>Indirect, incidental, or consequential damages</li>
                        <li>Third-party actions or content</li>
                    </ul>
                    <p><strong>Maximum liability is limited to the amount paid in the last 12 months.</strong></p>
                </div>

                <div class="policy-section">
                    <h3>9. Termination</h3>
                    <p>We reserve the right to:</p>
                    <ul>
                        <li>Suspend or terminate accounts violating these terms</li>
                        <li>Remove content that violates our policies</li>
                        <li>Refuse service to anyone at our discretion</li>
                    </ul>
                    <p>You may close your account at any time. Unused credits are non-refundable upon voluntary account closure.</p>
                </div>

                <div class="policy-section">
                    <h3>10. Dispute Resolution</h3>
                    <ul>
                        <li>Contact us first to resolve any disputes informally</li>
                        <li>Disputes will be governed by the laws of [Your Jurisdiction]</li>
                        <li>Arbitration may be required for unresolved disputes</li>
                    </ul>
                </div>

                <div class="policy-section">
                    <h3>11. Changes to Terms</h3>
                    <p>We may modify these terms at any time. Significant changes will be communicated via email or platform notifications. Continued use after changes constitutes acceptance.</p>
                </div>

                <div class="policy-section">
                    <h3>12. Contact Information</h3>
                    <p>For questions about these terms, please use our Contact form or email us directly.</p>
                    <p class="policy-updated">Last Updated: December 2024</p>
                </div>
            </div>
        `;
    }

    getRefundsPolicy() {
        return `
            <div class="modal-header">
                <h2><i class="fas fa-money-bill-wave"></i> Payments & Refunds Policy</h2>
            </div>
            <div class="modal-body scrollable">
                <div class="policy-section">
                    <h3>1. Payment Methods</h3>
                    <p>We accept payments through Razorpay, which supports:</p>
                    <ul>
                        <li>Credit Cards (Visa, Mastercard, American Express)</li>
                        <li>Debit Cards</li>
                        <li>UPI (Unified Payments Interface)</li>
                        <li>Net Banking</li>
                        <li>Digital Wallets (Paytm, PhonePe, Google Pay, etc.)</li>
                    </ul>
                    <p><strong>All payments are processed securely through Razorpay's PCI-DSS compliant platform.</strong></p>
                </div>

                <div class="policy-section">
                    <h3>2. Credit Packages</h3>
                    <p>Credits are sold in the following packages:</p>
                    <ul>
                        <li><strong>Starter Pack:</strong> 100 credits - Perfect for trying premium features</li>
                        <li><strong>Pro Pack:</strong> 500 credits - Best value for regular users</li>
                        <li><strong>Enterprise Pack:</strong> 2000 credits - For power users and businesses</li>
                    </ul>
                    <p>Pricing is displayed in your local currency (USD/INR) at checkout.</p>
                </div>

                <div class="policy-section">
                    <h3>3. Payment Processing</h3>
                    <ul>
                        <li>Credits are added to your account <strong>immediately</strong> upon successful payment</li>
                        <li>You will receive an email confirmation with transaction details</li>
                        <li>Payment receipts are available in your Billing & Credits page</li>
                        <li>Failed payments will not deduct credits or charge your account</li>
                    </ul>
                </div>

                <div class="policy-section">
                    <h3>4. Refund Policy</h3>
                    <p><strong>General Policy:</strong></p>
                    <ul>
                        <li>Credits are <strong>non-refundable</strong> once purchased and credited to your account</li>
                        <li>This is because credits are digital goods delivered instantly</li>
                    </ul>
                    
                    <p><strong>Exceptions (Refunds may be granted for):</strong></p>
                    <ul>
                        <li><strong>Duplicate Charges:</strong> If you were charged multiple times for the same purchase</li>
                        <li><strong>Technical Errors:</strong> If credits were not added despite successful payment</li>
                        <li><strong>Service Failure:</strong> If our service was unavailable for extended periods preventing credit usage</li>
                        <li><strong>Unauthorized Transactions:</strong> If your account was compromised (must be reported within 48 hours)</li>
                    </ul>
                </div>

                <div class="policy-section">
                    <h3>5. Refund Request Process</h3>
                    <p>To request a refund:</p>
                    <ol>
                        <li>Contact us through the Contact form or email within <strong>7 days</strong> of purchase</li>
                        <li>Provide your transaction ID and reason for refund</li>
                        <li>Our team will review your request within 2-3 business days</li>
                        <li>Approved refunds are processed within 5-7 business days</li>
                        <li>Refunds are issued to the original payment method</li>
                    </ol>
                </div>

                <div class="policy-section">
                    <h3>6. Credit Expiration</h3>
                    <ul>
                        <li><strong>Purchased Credits:</strong> Do not expire (valid indefinitely)</li>
                        <li><strong>Promotional Credits:</strong> May have expiration dates (clearly stated when granted)</li>
                        <li><strong>Free Trial Credits:</strong> May expire after 30 days of inactivity</li>
                    </ul>
                </div>

                <div class="policy-section">
                    <h3>7. Failed Transactions</h3>
                    <p>If your payment fails:</p>
                    <ul>
                        <li>Check with your bank/card provider for declined reasons</li>
                        <li>Ensure sufficient funds and correct card details</li>
                        <li>Try an alternative payment method</li>
                        <li>Contact Razorpay support for payment gateway issues</li>
                        <li>Contact us if credits aren't added after successful payment</li>
                    </ul>
                </div>

                <div class="policy-section">
                    <h3>8. Pricing Changes</h3>
                    <ul>
                        <li>We reserve the right to change credit prices at any time</li>
                        <li>Price changes do not affect already purchased credits</li>
                        <li>Significant price changes will be announced in advance</li>
                    </ul>
                </div>

                <div class="policy-section">
                    <h3>9. Taxes & Fees</h3>
                    <ul>
                        <li>All prices are inclusive of applicable taxes (GST/VAT)</li>
                        <li>No hidden fees or charges</li>
                        <li>Currency conversion fees may apply (charged by your bank)</li>
                    </ul>
                </div>

                <div class="policy-section">
                    <h3>10. Security & Fraud Prevention</h3>
                    <ul>
                        <li>We do not store your credit card information</li>
                        <li>All payment data is encrypted and handled by Razorpay</li>
                        <li>Suspicious transactions may be flagged for verification</li>
                        <li>Report unauthorized charges immediately</li>
                    </ul>
                </div>

                <div class="policy-section">
                    <h3>11. Contact for Payment Issues</h3>
                    <p>For payment-related queries:</p>
                    <ul>
                        <li>Use our Contact form</li>
                        <li>Email us with your transaction details</li>
                        <li>Include transaction ID, date, and amount</li>
                        <li>We respond within 24-48 hours</li>
                    </ul>
                    <p class="policy-updated">Last Updated: December 2024</p>
                </div>
            </div>
        `;
    }

    getContactForm() {
        return `
            <div class="modal-header">
                <h2><i class="fas fa-envelope"></i> Contact Us</h2>
            </div>
            <div class="modal-body">
                <p class="contact-intro">Have a question, suggestion, or need help? We'd love to hear from you!</p>
                
                <form id="contactForm" class="contact-form">
                    <div class="form-group">
                        <label for="contactName">
                            <i class="fas fa-user"></i> Your Name
                        </label>
                        <input 
                            type="text" 
                            id="contactName" 
                            name="name" 
                            required 
                            placeholder="Enter your full name"
                            class="form-input"
                        >
                    </div>

                    <div class="form-group">
                        <label for="contactEmail">
                            <i class="fas fa-envelope"></i> Email Address
                        </label>
                        <input 
                            type="email" 
                            id="contactEmail" 
                            name="email" 
                            required 
                            placeholder="your.email@example.com"
                            class="form-input"
                        >
                    </div>

                    <div class="form-group">
                        <label for="contactSubject">
                            <i class="fas fa-tag"></i> Subject
                        </label>
                        <select id="contactSubject" name="subject" required class="form-input">
                            <option value="">Select a topic...</option>
                            <option value="general">General Inquiry</option>
                            <option value="technical">Technical Support</option>
                            <option value="billing">Billing & Payments</option>
                            <option value="feature">Feature Request</option>
                            <option value="bug">Report a Bug</option>
                            <option value="feedback">Feedback</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="contactMessage">
                            <i class="fas fa-comment-alt"></i> Message
                        </label>
                        <textarea 
                            id="contactMessage" 
                            name="message" 
                            required 
                            rows="6"
                            placeholder="Tell us more about your inquiry..."
                            class="form-input"
                        ></textarea>
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary btn-submit">
                            <i class="fas fa-paper-plane"></i> Send Message
                        </button>
                    </div>
                </form>

                <div class="contact-info">
                    <p class="contact-note">
                        <i class="fas fa-info-circle"></i> 
                        We typically respond within 24-48 hours during business days.
                    </p>
                </div>
            </div>
        `;
    }

    initContactForm() {
        const form = document.getElementById('contactForm');

        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector('.btn-submit');
            const originalText = submitBtn.innerHTML;

            // Disable button and show loading
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

            // Get form data
            const formData = {
                name: form.name.value,
                email: form.email.value,
                subject: form.subject.value,
                message: form.message.value,
                timestamp: new Date().toISOString()
            };

            try {
                // TODO: Replace with actual backend endpoint
                // For now, simulate API call
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Success
                this.close();
                window.showToast(
                    'Thank you for contacting us! We\'ll get back to you soon.',
                    'success',
                    'Message Sent',
                    5000
                );

                // Log to console (remove in production)
                console.log('Contact form submission:', formData);

            } catch (error) {
                // Error
                window.showToast(
                    'Failed to send message. Please try again or email us directly.',
                    'error',
                    'Send Failed',
                    5000
                );

                // Re-enable button
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }
}

// Initialize modal manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.modalManager = new ModalManager();
});

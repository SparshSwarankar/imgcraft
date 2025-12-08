/**
 * Credit management and payments for ImgCraft
 */

const CreditManager = {
    data: {
        total_credits: 0,
        remaining_credits: 0,
        free_credits: 0
    },

    /**
     * Update credit display in UI
     */
    updateDisplay(creditData) {
        if (creditData) {
            this.data = creditData;
        }

        const balanceEl = document.getElementById('creditBalance');
        if (balanceEl) {
            balanceEl.textContent = this.data.remaining_credits;

            if (this.data.remaining_credits < 5) {
                balanceEl.classList.add('text-warning');
            } else {
                balanceEl.classList.remove('text-warning');
            }
        }

        const billingBalanceEl = document.getElementById('billingBalance');
        if (billingBalanceEl) {
            billingBalanceEl.textContent = this.data.remaining_credits;
        }
    },

    /**
     * Refresh credits from backend
     */
    async refreshCredits() {
        try {
            const headers = AuthManager.getAuthHeaders();
            if (!headers.Authorization) return;

            const response = await fetch('/api/credits/balance', { headers });
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.updateDisplay(result.data);
                }
            }
        } catch (error) {
            console.error('Failed to refresh credits:', error);
        }
    },

    /**
     * Initiate credit purchase
     */
    async buyCredits(planId) {
        try {
            // Check if user is logged in
            if (!AuthManager || !AuthManager.session) {
                showToast('Please login to purchase credits', 'error');
                // Redirect to auth page after a short delay
                setTimeout(() => {
                    window.location.href = '/auth';
                }, 1500);
                return;
            }

            const headers = AuthManager.getAuthHeaders();
            if (!headers.Authorization) {
                showToast('Authentication required. Please login again.', 'error');
                setTimeout(() => {
                    window.location.href = '/auth';
                }, 1500);
                return;
            }

            // Show loading toast
            showToast('Creating payment order...', 'info');

            // 1. Create Order
            const orderResponse = await fetch('/api/payments/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                body: JSON.stringify({ plan_id: planId })
            });

            // Check if response is OK
            if (!orderResponse.ok) {
                if (orderResponse.status === 401) {
                    throw new Error('Session expired. Please login again.');
                } else if (orderResponse.status === 500) {
                    throw new Error('Server error. Please try again later.');
                }
                throw new Error(`HTTP ${orderResponse.status}: ${orderResponse.statusText}`);
            }

            const orderResult = await orderResponse.json();
            if (!orderResult.success) {
                throw new Error(orderResult.error || 'Failed to create order');
            }

            const { order } = orderResult;

            // Check if Razorpay is loaded
            if (typeof Razorpay === 'undefined') {
                throw new Error('Razorpay SDK not loaded. Please refresh the page.');
            }

            // Check if Razorpay key is configured
            if (!window.RAZORPAY_KEY_ID) {
                throw new Error('Payment gateway not configured. Please contact support.');
            }

            // 2. Open Razorpay Checkout
            const options = {
                key: window.RAZORPAY_KEY_ID, // Defined in base.html
                amount: order.amount,
                currency: order.currency,
                name: "ImgCraft",
                description: `Purchase Credits`,
                order_id: order.id,
                handler: async function (response) {
                    // 3. Verify Payment
                    await CreditManager.verifyPayment(response);
                },
                prefill: {
                    name: AuthManager.user?.user_metadata?.full_name || "",
                    email: AuthManager.user?.email || ""
                },
                theme: {
                    color: "#F97316"
                },
                modal: {
                    ondismiss: function () {
                        showToast('Payment cancelled', 'info');
                    }
                }
            };

            const rzp = new Razorpay(options);
            rzp.on('payment.failed', function (response) {
                showToast('Payment failed: ' + response.error.description, 'error');
            });
            rzp.open();

        } catch (error) {
            console.error('Purchase failed:', error);
            showToast(error.message || 'Failed to initiate payment', 'error');
        }
    },

    /**
     * Verify payment with backend
     */
    async verifyPayment(paymentResponse) {
        // Show processing toast
        showToast('Processing payment...', 'info');

        try {
            const headers = AuthManager.getAuthHeaders();

            // Make verification request
            const response = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                body: JSON.stringify(paymentResponse)
            });

            // Parse response
            const result = await response.json();

            // Check if request was successful
            if (!response.ok) {
                // Server returned an error status
                console.error('Payment verification failed:', result);
                showToast(
                    result.error || 'Payment verification failed. Please contact support.',
                    'error'
                );
                return;
            }

            // Check if verification was successful
            if (result.success) {
                // Payment verified and credits added!
                console.log('Payment processed successfully:', result);

                showToast(
                    `Payment successful! ${result.credits_added} credits added to your account.`,
                    'success',
                    'Payment Confirmed'
                );

                // Refresh credits immediately
                await this.refreshCredits();

                // Refresh billing history if on billing page
                if (window.loadBillingHistory) {
                    setTimeout(() => {
                        window.loadBillingHistory();
                    }, 500);
                }

                // Trigger review modal after toast notification disappears
                // Toast shows for 4 seconds, so trigger review after 5 seconds
                console.log('🎉 Payment successful! Review modal will appear after notification...');
                if (window.reviewModalManager) {
                    setTimeout(() => {
                        console.log('✅ Showing review modal now');
                        // Use the instance method directly
                        window.reviewModalManager.show('purchase', {
                            title: 'Thank you for your purchase!',
                            subtitle: 'How was your experience? We\'d appreciate your feedback.',
                            icon: '🎉'
                        });
                    }, 5000); // 5 seconds - after toast disappears
                } else {
                    console.warn('❌ reviewModalManager not found! Review modal will not show.');
                }

                // Log success
                console.log(`Credits added: ${result.credits_added}, New balance: ${result.new_balance}`);

            } else {
                // Verification failed
                console.error('Payment verification returned failure:', result);
                showToast(
                    result.error || 'Payment verification failed',
                    'error',
                    'Verification Failed'
                );
            }

        } catch (error) {
            // Network or parsing error
            console.error('Payment verification error:', error);
            showToast(
                'Error verifying payment. Please check your internet connection and contact support if the issue persists.',
                'error',
                'Connection Error'
            );
        }
    },

    /**
     * Check if user has enough credits for a tool
     */
    hasCredits(cost) {
        return this.data.remaining_credits >= cost;
    },

    /**
     * Reset data (on logout)
     */
    reset() {
        this.data = {
            total_credits: 0,
            remaining_credits: 0,
            free_credits: 0
        };
        this.updateDisplay();
    }
};

// Make CreditManager globally accessible
window.CreditManager = CreditManager;

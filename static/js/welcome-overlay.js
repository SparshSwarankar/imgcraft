/**
 * ImgCraft - First Visit Welcome Overlay
 * Shows a beautiful welcome message to first-time visitors
 */

(function() {
    'use strict';

    // Check if this is the user's first visit
    fetch('/api/check-first-visit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.isFirstVisit) {
            // Small delay for smooth page load
            setTimeout(() => showWelcomeOverlay(), 800);
        }
    })
    .catch(error => console.log('First visit check error:', error));

    function showWelcomeOverlay() {
        // Create overlay element
        const overlay = document.createElement('div');
        overlay.id = 'welcome-overlay';
        overlay.innerHTML = `
            <div class="welcome-modal">
                <div class="welcome-content">
                    <div class="welcome-logo">
                        <img src="/static/image/Logo.jpg" alt="ImgCraft Logo">
                    </div>
                    <h1 class="welcome-title">Welcome to ImgCraft! 🎨</h1>
                    <p class="welcome-subtitle">Your All-in-One Image Toolkit</p>
                    <div class="welcome-features">
                        <div class="feature-item">
                            <i class="fas fa-magic"></i>
                            <span>AI Background Removal</span>
                        </div>
                        <div class="feature-item">
                            <i class="fas fa-compress"></i>
                            <span>Smart Compression</span>
                        </div>
                        <div class="feature-item">
                            <i class="fas fa-crop"></i>
                            <span>Advanced Editing</span>
                        </div>
                        <div class="feature-item">
                            <i class="fas fa-palette"></i>
                            <span>Color Tools</span>
                        </div>
                    </div>
                    <p class="welcome-message">Process images instantly in your browser - fast, secure, and privacy-focused.</p>
                    <button class="welcome-btn" onclick="closeWelcomeOverlay()">
                        <i class="fas fa-rocket"></i> Get Started
                    </button>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #welcome-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.92);
                backdrop-filter: blur(10px);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.4s ease;
            }

            .welcome-modal {
                background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
                border-radius: 24px;
                padding: 40px;
                max-width: 520px;
                width: 90%;
                border: 2px solid rgba(249, 115, 22, 0.3);
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                animation: slideUp 0.5s ease;
                text-align: center;
                position: relative;
            }

            .welcome-logo {
                margin-bottom: 20px;
                animation: bounce 1s ease;
            }

            .welcome-logo img {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                border: 3px solid #F97316;
                box-shadow: 0 4px 20px rgba(249, 115, 22, 0.4);
            }

            .welcome-title {
                font-size: 2rem;
                font-weight: 800;
                background: linear-gradient(135deg, #F97316, #EA580C);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 10px;
            }

            .welcome-subtitle {
                color: #94A3B8;
                font-size: 1.1rem;
                margin-bottom: 30px;
                font-weight: 500;
            }

            .welcome-features {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
                margin-bottom: 30px;
            }

            .feature-item {
                background: rgba(255, 255, 255, 0.05);
                padding: 15px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                gap: 10px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                transition: all 0.3s ease;
            }

            .feature-item:hover {
                background: rgba(249, 115, 22, 0.1);
                border-color: #F97316;
                transform: translateY(-2px);
            }

            .feature-item i {
                color: #F97316;
                font-size: 1.2rem;
            }

            .feature-item span {
                color: #F8FAFC;
                font-size: 0.9rem;
                font-weight: 600;
            }

            .welcome-message {
                color: #CBD5E1;
                line-height: 1.6;
                margin-bottom: 30px;
                font-size: 0.95rem;
            }

            .welcome-btn {
                background: linear-gradient(135deg, #F97316, #EA580C);
                color: white;
                border: none;
                padding: 15px 40px;
                border-radius: 12px;
                font-size: 1.1rem;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 20px rgba(249, 115, 22, 0.4);
            }

            .welcome-btn:hover {
                transform: translateY(-3px);
                box-shadow: 0 6px 30px rgba(249, 115, 22, 0.6);
            }

            .welcome-btn i {
                margin-right: 8px;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(30px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }

            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }

            @media (max-width: 600px) {
                .welcome-modal {
                    padding: 30px 20px;
                    max-width: 95%;
                }

                .welcome-title {
                    font-size: 1.5rem;
                }

                .welcome-subtitle {
                    font-size: 1rem;
                }

                .welcome-features {
                    grid-template-columns: 1fr;
                    gap: 12px;
                }

                .feature-item {
                    padding: 12px;
                }

                .welcome-btn {
                    width: 100%;
                    padding: 12px 30px;
                }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(overlay);

        // Close on background click
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                closeWelcomeOverlay();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeWelcomeOverlay();
            }
        });
    }

    window.closeWelcomeOverlay = function() {
        const overlay = document.getElementById('welcome-overlay');
        if (overlay) {
            overlay.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => overlay.remove(), 300);
        }
    };
})();

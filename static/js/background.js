class ParticleNetwork {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.warn('Background canvas not found');
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: null, y: null };
        this.animationId = null;
        this.isVisible = true;
        this.config = {
            particleCount: 100,
            connectionDistance: 150,
            mouseDistance: 200,
            baseSpeed: 0.5,
            color: 'rgba(249, 115, 22, 0.5)', // Primary orange with opacity
            lineColor: 'rgba(249, 115, 22, 0.15)'
        };

        this.init();
    }

    init() {
        this.resize();
        this.createParticles();
        this.addEventListeners();
        this.animate();
    }

    resize() {
        // Use a stable viewport height for mobile browsers
        let vw = window.innerWidth;
        let vh;
        
        // Prefer visualViewport API if available (for mobile browsers)
        if (window.visualViewport) {
            vh = Math.max(
                window.visualViewport.height,
                document.documentElement.clientHeight,
                window.innerHeight
            );
        } else {
            vh = Math.max(document.documentElement.clientHeight, window.innerHeight);
        }
        
        // For desktop, use standard window height
        if (vw > 1024) {
            vh = window.innerHeight;
        }
        
        // Set canvas dimensions
        this.canvas.width = vw;
        this.canvas.height = vh;
        
        // Also update CSS for consistency
        this.canvas.style.width = vw + 'px';
        this.canvas.style.height = vh + 'px';
    }

    createParticles() {
        this.particles = [];
        const count = window.innerWidth < 768 ? 50 : this.config.particleCount;

        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * this.config.baseSpeed,
                vy: (Math.random() - 0.5) * this.config.baseSpeed,
                size: Math.random() * 2 + 1
            });
        }
    }

    addEventListeners() {
        let resizeTimeout;
        
        // Debounced resize handler for better performance
        const resizeHandler = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.resize();
                this.createParticles();
            }, 150);
        };
        
        window.addEventListener('resize', resizeHandler);
        window.addEventListener('orientationchange', resizeHandler);
        
        // On mobile, also listen to visualViewport resize if available
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', resizeHandler);
        }

        // Mouse tracking
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.x;
            this.mouse.y = e.y;
        });

        window.addEventListener('mouseleave', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });
        
        // Visibility API - pause when tab is hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAnimation();
            } else {
                this.resumeAnimation();
            }
        });
        
        // Pause when page is not in focus (performance optimization)
        window.addEventListener('blur', () => this.pauseAnimation());
        window.addEventListener('focus', () => this.resumeAnimation());
    }

    pauseAnimation() {
        this.isVisible = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    resumeAnimation() {
        if (!this.isVisible) {
            this.isVisible = true;
            this.animate();
        }
    }

    drawLines(p1, p2, distance) {
        const opacity = 1 - (distance / this.config.connectionDistance);
        this.ctx.strokeStyle = this.config.lineColor.replace('0.15', opacity * 0.15);
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
    }

    update() {
        this.particles.forEach(p => {
            // Move particles
            p.x += p.vx;
            p.y += p.vy;

            // Bounce off edges with buffer to prevent sticking
            const buffer = 5;
            if (p.x < buffer || p.x > this.canvas.width - buffer) {
                p.vx *= -1;
                p.x = Math.max(buffer, Math.min(this.canvas.width - buffer, p.x));
            }
            if (p.y < buffer || p.y > this.canvas.height - buffer) {
                p.vy *= -1;
                p.y = Math.max(buffer, Math.min(this.canvas.height - buffer, p.y));
            }

            // Mouse interaction (Antigravity/Repulsion)
            if (this.mouse.x != null) {
                const dx = this.mouse.x - p.x;
                const dy = this.mouse.y - p.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.config.mouseDistance) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = (this.config.mouseDistance - distance) / this.config.mouseDistance;

                    // Push away from cursor
                    const directionX = forceDirectionX * force * 2;
                    const directionY = forceDirectionY * force * 2;

                    p.vx -= directionX * 0.05;
                    p.vy -= directionY * 0.05;
                }
            }

            // Friction to stabilize speed
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > this.config.baseSpeed * 2) {
                p.vx *= 0.95;
                p.vy *= 0.95;
            }
        });
    }

    draw() {
        // Clear with slight fade for motion trail effect (optional)
        this.ctx.fillStyle = 'rgba(2, 6, 23, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];

            // Draw particle
            this.ctx.fillStyle = this.config.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();

            // Connect particles
            for (let j = i + 1; j < this.particles.length; j++) {
                const p2 = this.particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.config.connectionDistance) {
                    this.drawLines(p, p2, distance);
                }
            }
        }
    }

    animate() {
        if (!this.isVisible) return;
        
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    destroy() {
        this.pauseAnimation();
        window.removeEventListener('resize', this.resize);
        window.removeEventListener('mousemove', this.mousemove);
        window.removeEventListener('mouseleave', this.mouseleave);
    }
}

// Initialize when DOM is ready with error handling
document.addEventListener('DOMContentLoaded', () => {
    try {
        const bgCanvas = document.getElementById('bg-canvas');
        if (bgCanvas) {
            new ParticleNetwork('bg-canvas');
            console.log('✓ Background animation initialized');
        }
    } catch (error) {
        console.error('Background animation failed to initialize:', error);
    }
});

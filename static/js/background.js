class ParticleNetwork {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: null, y: null };
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
            vh = window.visualViewport.height;
        } else {
            vh = Math.max(document.documentElement.clientHeight, window.innerHeight);
        }
        // For desktop, fallback to window.innerHeight
        if (vw > 1024) {
            vh = window.innerHeight;
        }
        this.canvas.width = vw;
        this.canvas.height = vh;
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
        // Use resize and orientationchange for best coverage
        const resizeHandler = () => {
            this.resize();
            this.createParticles();
        };
        window.addEventListener('resize', resizeHandler);
        window.addEventListener('orientationchange', resizeHandler);
        // On mobile, also listen to visualViewport resize if available
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', resizeHandler);
        }

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.x;
            this.mouse.y = e.y;
        });

        window.addEventListener('mouseleave', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });
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

            // Bounce off edges
            if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;

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
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

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
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ParticleNetwork('bg-canvas');
});

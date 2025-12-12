document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    
    // --- CONFIGURATION (Adjusted for "Polite but Visible" Motion) ---
    const particleCount = 15; 
    const moveSpeed = 0.2;        // Increased: Was 0.08 (invisible), now 0.5 (slow drift)
    const swaySpeed = 0.005;      // Speed of the "waving" motion
    const swayAmplitude = 1.5;    // Distance of the sway (Makes it look organic)

    // Get theme colors
    const rootStyles = getComputedStyle(document.documentElement);
    const colorPrimary = rootStyles.getPropertyValue('--primary').trim() || '#F97316';
    const colorSecondary = rootStyles.getPropertyValue('--secondary').trim() || '#E11D48';

    function hexToRgba(hex, alpha) {
        hex = hex.replace('#', '');
        let r = parseInt(hex.substring(0, 2), 16);
        let g = parseInt(hex.substring(2, 4), 16);
        let b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    class Particle {
        constructor() {
            this.init(true); // true = random start position
        }

        init(randomStart = false) {
            // Position
            this.x = randomStart ? Math.random() * canvas.width : Math.random() * canvas.width;
            this.y = randomStart ? Math.random() * canvas.height : canvas.height + 100;

            // Movement Velocity (Linear Drift)
            this.vx = (Math.random() - 0.5) * moveSpeed; 
            this.vy = (Math.random() - 0.5) * moveSpeed;

            // Size & Look
            this.radius = Math.random() * 120 + 60; // Big soft orbs
            this.opacity = Math.random() * 0.15 + 0.05; // Subtle transparency
            
            // Oscillation (The "Breathing" logic)
            this.angle = Math.random() * Math.PI * 2;
            
            // Color
            const baseColor = Math.random() > 0.5 ? colorPrimary : colorSecondary;
            this.color = hexToRgba(baseColor, this.opacity);
        }

        update() {
            // 1. Linear Movement
            this.x += this.vx;
            this.y += this.vy;

            // 2. Organic Sway (Sine Wave)
            // This makes it look like it's floating in water, not just moving straight
            this.x += Math.sin(this.angle) * swayAmplitude; 
            this.y += Math.cos(this.angle) * swayAmplitude;
            this.angle += swaySpeed;

            // 3. Screen Wrap (Infinite Loop)
            // If it goes off the right, move to left
            if (this.x - this.radius > canvas.width) this.x = -this.radius;
            if (this.x + this.radius < 0) this.x = canvas.width + this.radius;
            
            // If it goes off the bottom, move to top
            if (this.y - this.radius > canvas.height) this.y = -this.radius;
            if (this.y + this.radius < 0) this.y = canvas.height + this.radius;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            
            // BLUR EFFECT: This gives it the "Bokeh" look
            // If the site feels slow on mobile, reduce "60px" to "30px"
            ctx.filter = "blur(60px)"; 
            
            ctx.fill();
            ctx.filter = "none"; // Reset filter
            ctx.closePath();
        }
    }

    function init() {
        resize();
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
        animate();
    }

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    init();
});
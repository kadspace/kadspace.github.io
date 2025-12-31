const canvas = document.getElementById('neural-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let mouse = { x: null, y: null };

// Configuration for the effect
const CONFIG = {
    particleCount: 100, // Density
    connectionDistance: 150, // How far to draw lines
    mouseDistance: 250, // Range of mouse influence (the "flashlight")
    baseSpeed: 0.5,
    color: '0, 255, 157' // The accent RGB value
};

// Resize handling
function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    initParticles();
}

window.addEventListener('resize', resize);

// Mouse tracking
window.addEventListener('mousemove', (e) => {
    mouse.x = e.x;
    mouse.y = e.y;
});

window.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
});

// Particle Class
class Particle {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * CONFIG.baseSpeed;
        this.vy = (Math.random() - 0.5) * CONFIG.baseSpeed;
        this.size = Math.random() * 2 + 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off edges
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Mouse repulsion/attraction (optional - here we just use mouse for "lighting" lines)
        // Adding a slight drift away from mouse could be cool, but let's keep it simple for now.
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${CONFIG.color}, 0.2)`;
        ctx.fill();
    }
}

function initParticles() {
    particles = [];
    // Adjust count based on screen size
    const count = (width * height) / 15000; // Density heuristic
    for (let i = 0; i < count; i++) {
        particles.push(new Particle());
    }
}

// Main Animation Loop
function animate() {
    ctx.clearRect(0, 0, width, height);

    // Update and draw particles
    particles.forEach(p => {
        p.update();
        p.draw();
    });

    // Draw lines
    connectParticles();

    requestAnimationFrame(animate);
}

function connectParticles() {
    for (let i = 0; i < particles.length; i++) {
        for (let j = i; j < particles.length; j++) {
            let p1 = particles[i];
            let p2 = particles[j];

            let dx = p1.x - p2.x;
            let dy = p1.y - p2.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < CONFIG.connectionDistance) {
                // Base opacity based on proximity to each other
                let opacity = 1 - (distance / CONFIG.connectionDistance);

                // Mouse Interaction: "Heatmap" effect
                // If the connection is within range of the mouse, it glows brighter and potentially changes color/width
                let isMouseNear = false;
                if (mouse.x != null) {
                    let mdx = mouse.x - p1.x; // Proximity to p1
                    let mdy = mouse.y - p1.y;
                    let mouseDist = Math.sqrt(mdx * mdx + mdy * mdy);

                    if (mouseDist < CONFIG.mouseDistance) {
                        isMouseNear = true;
                        // Boost opacity significantly if near mouse
                        // The closer the mouse, the stronger the boost
                        opacity += (1 - (mouseDist / CONFIG.mouseDistance)) * 1.5;
                    }
                }

                if (opacity > 0) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(${CONFIG.color}, ${Math.min(opacity, 0.8)})`; // Cap alpha at 0.8
                    ctx.lineWidth = isMouseNear ? 1.5 : 0.5; // Thicker lines near mouse
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }
    }
}

// Start
resize();
animate();

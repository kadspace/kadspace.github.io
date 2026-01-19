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
    color: { r: 0, g: 255, b: 157 } // Object for dynamic modification
};

// Scroll Handler for Color Shift and Header Status
window.addEventListener('scroll', () => {
    const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    const header = document.querySelector('header');
    const heroSection = document.querySelector('.hero');

    // Show/hide header status indicator when scrolling past hero
    if (heroSection) {
        const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
        if (window.scrollY > heroBottom - 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    // Shift from Green (0, 255, 157) -> Electric Yellow (220, 255, 50)
    // Very subtle shift, keeping the "system ready" vibe
    CONFIG.color.r = Math.floor(0 + (220 * scrollPercent));
    CONFIG.color.g = 255; // Stay bright green/yellow
    CONFIG.color.b = Math.floor(157 - (107 * scrollPercent));  // 157 -> 50

    // Update main accent color in CSS for consistency
    document.documentElement.style.setProperty('--accent', `rgb(${CONFIG.color.r}, ${CONFIG.color.g}, ${CONFIG.color.b})`);
    document.documentElement.style.setProperty('--accent-glow', `rgba(${CONFIG.color.r}, ${CONFIG.color.g}, ${CONFIG.color.b}, 0.2)`);

    // Progressive Blur on Background
    // Start blurring after a bit of scrolling, max out at bottom
    // Progressive Blur on Background
    // Start blurring after a bit of scrolling, max out at bottom
    // ULTRA REDUCED intensity per user request (8px -> 3px)
    const blurAmount = Math.min(3, Math.floor(scrollPercent * 5));
    canvas.style.filter = `blur(${blurAmount}px)`;
});

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
        ctx.fillStyle = `rgba(${CONFIG.color.r}, ${CONFIG.color.g}, ${CONFIG.color.b}, 0.2)`;
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
                    ctx.strokeStyle = `rgba(${CONFIG.color.r}, ${CONFIG.color.g}, ${CONFIG.color.b}, ${Math.min(opacity, 0.8)})`; // Cap alpha at 0.8
                    ctx.lineWidth = isMouseNear ? 1.5 : 0.5; // Thicker lines near mouse
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }
    }
}

// Toggle Music Section
function toggleMusic() {
    const content = document.getElementById('music-content');
    const header = document.querySelector('.collapsible-header h2');

    if (content.style.maxHeight) {
        content.style.maxHeight = null;
        header.innerText = "[+] Creative Subroutines";
        content.style.opacity = 0;
    } else {
        content.style.maxHeight = content.scrollHeight + "px";
        header.innerText = "[-] Creative Subroutines";
        content.style.opacity = 1;
    }
}

// Header Scroll Logic
const header = document.querySelector('header');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Custom Audio Player Logic
const audio = document.getElementById('audio-source');
const playBtn = document.getElementById('play-btn');
const progressBar = document.getElementById('progress-fill');
const progressBarBg = document.querySelector('.progress-bar-bg');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const volIcon = document.getElementById('vol-icon');
const volBarBg = document.querySelector('.vol-bar-bg');
const volFill = document.getElementById('vol-fill');

let isDragging = false;
let isVolDragging = false;

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

if (playBtn && audio && progressBarBg) {
    // Play/Pause
    playBtn.addEventListener('click', () => {
        if (audio.paused) {
            audio.play().then(() => {
                playBtn.classList.add('is-playing');
            }).catch(e => console.error("Playback failed:", e));
        } else {
            audio.pause();
            playBtn.classList.remove('is-playing');
        }
    });

    // Default state: ensure it's not playing initially
    playBtn.classList.remove('is-playing');

    // Metadata loaded (duration)
    audio.addEventListener('loadedmetadata', () => {
        durationEl.innerText = formatTime(audio.duration);
    });

    // Update Progress & Time
    audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
            const percent = (audio.currentTime / audio.duration) * 100;
            if (!isDragging) {
                progressBar.style.width = `${percent}%`;
            }
            currentTimeEl.innerText = formatTime(audio.currentTime);
        }
    });

    // Scrubbing Logic
    function updateScrub(e) {
        const rect = progressBarBg.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        let percent = clickX / rect.width;
        percent = Math.max(0, Math.min(1, percent)); // Clamp between 0 and 1

        if (audio.duration) {
            audio.currentTime = percent * audio.duration;
            progressBar.style.width = `${percent * 100}%`;
        }
    }

    progressBarBg.addEventListener('mousedown', (e) => {
        isDragging = true;
        updateScrub(e); // Seek immediately on click
    });

    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault(); // Prevent text selection
            updateScrub(e);
        }
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
        }
    });

    // Reset on end
    audio.addEventListener('ended', () => {
        playBtn.classList.remove('is-playing');
        progressBar.style.width = '0%';
        audio.currentTime = 0;
    });

    // Volume Logic
    function updateVolume(e) {
        const rect = volBarBg.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        let percent = clickX / rect.width;
        percent = Math.max(0, Math.min(1, percent));

        audio.volume = percent;
        volFill.style.width = `${percent * 100}%`;

        // Update icon based on level
        if (percent === 0) {
            volIcon.classList.add('is-muted');
        } else {
            volIcon.classList.remove('is-muted');
        }
    }

    volBarBg.addEventListener('mousedown', (e) => {
        isVolDragging = true;
        updateVolume(e);
    });

    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault();
            updateScrub(e);
        }
        if (isVolDragging) {
            e.preventDefault();
            updateVolume(e);
        }
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) isDragging = false;
        if (isVolDragging) isVolDragging = false;
    });

    // Mute toggle
    let lastVol = 1;
    volIcon.addEventListener('click', () => {
        if (audio.volume > 0) {
            lastVol = audio.volume;
            audio.volume = 0;
            volFill.style.width = '0%';
            volIcon.classList.add('is-muted');
        } else {
            audio.volume = lastVol;
            volFill.style.width = `${lastVol * 100}%`;
            volIcon.classList.remove('is-muted');
        }
    });
}

// Start
resize();
animate();

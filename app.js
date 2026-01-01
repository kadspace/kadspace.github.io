const canvas = document.getElementById('neural-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let grid = [];
const GRID_COLS = 28; // MNIST style
const GRID_ROWS = 28;
let CELL_SIZE = 20;
let gridOffsetX = 0;
let gridOffsetY = 0;

// Digits 0-9 (5x7 bitmaps, centered in 28x28 later)
// 1 = filled, 0 = empty
const DIGIT_BITMAPS = {
    0: [
        [0, 1, 1, 1, 0],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 1, 1], // slight variation
        [1, 0, 1, 0, 1],
        [1, 1, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [0, 1, 1, 1, 0]
    ],
    1: [
        [0, 0, 1, 0, 0],
        [0, 1, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 1, 1, 1, 0]
    ],
    2: [
        [0, 1, 1, 1, 0],
        [1, 0, 0, 0, 1],
        [0, 0, 0, 0, 1],
        [0, 0, 0, 1, 0],
        [0, 0, 1, 0, 0],
        [0, 1, 0, 0, 0],
        [1, 1, 1, 1, 1]
    ],
    3: [
        [1, 1, 1, 1, 0],
        [0, 0, 0, 0, 1],
        [0, 0, 0, 1, 0],
        [0, 0, 1, 1, 0],
        [0, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [0, 1, 1, 1, 0]
    ],
    4: [
        [0, 0, 0, 1, 0],
        [0, 0, 1, 1, 0],
        [0, 1, 0, 1, 0],
        [1, 0, 0, 1, 0],
        [1, 1, 1, 1, 1],
        [0, 0, 0, 1, 0],
        [0, 0, 0, 1, 0]
    ],
    5: [
        [1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0],
        [1, 1, 1, 1, 0],
        [0, 0, 0, 0, 1],
        [0, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [0, 1, 1, 1, 0]
    ],
    6: [
        [0, 1, 1, 1, 0],
        [1, 0, 0, 0, 0],
        [1, 0, 0, 0, 0],
        [1, 1, 1, 1, 0],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [0, 1, 1, 1, 0]
    ],
    7: [
        [1, 1, 1, 1, 1],
        [0, 0, 0, 0, 1],
        [0, 0, 0, 0, 1],
        [0, 0, 0, 1, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0]
    ],
    8: [
        [0, 1, 1, 1, 0],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [0, 1, 1, 1, 0],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [0, 1, 1, 1, 0]
    ],
    9: [
        [0, 1, 1, 1, 0],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [0, 1, 1, 1, 1],
        [0, 0, 0, 0, 1],
        [0, 0, 0, 0, 1],
        [0, 1, 1, 1, 0]
    ]
};

// Configuration
const CONFIG = {
    color: { r: 0, g: 255, b: 157 },
    predictionInterval: 3000, // New digit every 3s
    fadeSpeed: 0.05
};

// State
let lastPredictionTime = 0;
let currentDigit = -1;
let phase = 'noise'; // 'noise', 'resolve', 'hold', 'fade'

// Scroll Handler for Color Shift (kept from original)
window.addEventListener('scroll', () => {
    const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    CONFIG.color.r = Math.floor(0 + (220 * scrollPercent));
    CONFIG.color.g = 255;
    CONFIG.color.b = Math.floor(157 - (107 * scrollPercent));
    document.documentElement.style.setProperty('--accent', `rgb(${CONFIG.color.r}, ${CONFIG.color.g}, ${CONFIG.color.b})`);
    document.documentElement.style.setProperty('--accent-glow', `rgba(${CONFIG.color.r}, ${CONFIG.color.g}, ${CONFIG.color.b}, 0.2)`);

    // Blur effect
    const blurAmount = Math.min(3, Math.floor(scrollPercent * 5));
    canvas.style.filter = `blur(${blurAmount}px)`;
});

class Cell {
    constructor(c, r) {
        this.c = c;
        this.r = r;
        this.value = 0; // Current opacity/intensity
        this.targetValue = 0;
    }

    update() {
        // Smoothly interpolate towards target
        this.value += (this.targetValue - this.value) * CONFIG.fadeSpeed;
        if (Math.abs(this.targetValue - this.value) < 0.01) this.value = this.targetValue;
    }

    draw(xOffset, yOffset, size) {
        if (this.value < 0.05) return; // Optimize

        const x = xOffset + this.c * size;
        const y = yOffset + this.r * size;
        const padding = size * 0.1; // Gap between squares

        // Increased opacity base from 0.4 to 0.6
        ctx.fillStyle = `rgba(${CONFIG.color.r}, ${CONFIG.color.g}, ${CONFIG.color.b}, ${this.value * 0.6})`;
        ctx.fillRect(x + padding, y + padding, size - padding * 2, size - padding * 2);

        // Brighter core
        if (this.value > 0.5) {
            ctx.fillStyle = `rgba(${CONFIG.color.r}, ${CONFIG.color.g}, ${CONFIG.color.b}, ${this.value * 0.9})`;
            ctx.fillRect(x + padding + 2, y + padding + 2, size - padding * 2 - 4, size - padding * 2 - 4);
        }
    }
}

function initGrid() {
    console.log("Initializing Grid Animation System"); // Debug
    grid = [];
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            grid.push(new Cell(c, r));
        }
    }
}

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Position grid on the right side
    // We want roughly 30-40% of the screen width for the grid, usually on the right
    // Let's make it responsive.

    // On wide screens, put it on the right.
    // On mobile, maybe center it?

    if (width > 768) {
        // Desktop: Right side vertical centered
        CELL_SIZE = Math.min(width * 0.4 / GRID_COLS, height * 0.6 / GRID_ROWS);
        CELL_SIZE = Math.max(CELL_SIZE, 10); // Minimum size
        gridOffsetX = width * 0.65; // Start at 65% width
        gridOffsetY = (height - (GRID_ROWS * CELL_SIZE)) / 2;
    } else {
        // Mobile: Background, centered, fade out more?
        CELL_SIZE = Math.min(width * 0.8 / GRID_COLS, height * 0.5 / GRID_ROWS);
        gridOffsetX = (width - (GRID_COLS * CELL_SIZE)) / 2;
        gridOffsetY = height * 0.2;
    }
}

window.addEventListener('resize', () => {
    resize();
    initGrid(); // Re-init to be safe (though not strictly necessary if just resizing)
});

function getDigitTarget(digit) {
    // Return 28x28 array of target values
    // Map 5x7 bitmap to center of 28x28
    const map = new Array(GRID_ROWS * GRID_COLS).fill(0);
    if (digit === -1) return map; // Empty

    const bitmap = DIGIT_BITMAPS[digit];
    const bitmapH = bitmap.length;
    const bitmapW = bitmap[0].length;

    const startRow = Math.floor((GRID_ROWS - bitmapH) / 2);
    const startCol = Math.floor((GRID_COLS - bitmapW) / 2);

    for (let r = 0; r < bitmapH; r++) {
        for (let c = 0; c < bitmapW; c++) {
            if (bitmap[r][c] === 1) {
                const targetIndex = (startRow + r) * GRID_COLS + (startCol + c);
                map[targetIndex] = 1;
            }
        }
    }
    return map;
}

function animate(timestamp) {
    ctx.clearRect(0, 0, width, height);

    // Logic Loop
    if (timestamp - lastPredictionTime > CONFIG.predictionInterval) {
        // New Cycle
        lastPredictionTime = timestamp;
        currentDigit = Math.floor(Math.random() * 10);

        // Reset grid target to "noise" first?
        // Let's do: Current -> Fade -> Noise -> New Digit
        // Actually simple: Just set new target.
        // But to make it look like "predicting", let's add some noise.
    }

    // Manage Phases based on time within interval
    const progress = (timestamp - lastPredictionTime) / CONFIG.predictionInterval;

    // 0.0 - 0.2: Fade out previous / Noise
    // 0.2 - 0.5: Form shape (Prediction)
    // 0.5 - 0.9: Hold
    // 0.9 - 1.0: Fade out

    let targetMap;

    if (progress < 0.2) {
        // Noise Phase: Random static
        grid.forEach(cell => {
            if (Math.random() < 0.1) cell.targetValue = Math.random() * 0.5;
            else cell.targetValue = 0;
        });
    } else if (progress < 0.8) {
        // Target Phase
        const targets = getDigitTarget(currentDigit); // This is inefficient to call every frame? No, it's small.
        // Optimization: Calculate targets once per cycle.
        // For now, let's just calculate index.

        const bitmap = DIGIT_BITMAPS[currentDigit];
        const bitmapH = bitmap.length;
        const bitmapW = bitmap[0].length;
        const startRow = Math.floor((GRID_ROWS - bitmapH) / 2);
        const startCol = Math.floor((GRID_COLS - bitmapW) / 2);

        grid.forEach(cell => {
            // Default 0
            let t = 0;
            // Check if inside digit map
            if (cell.r >= startRow && cell.r < startRow + bitmapH &&
                cell.c >= startCol && cell.c < startCol + bitmapW) {
                if (bitmap[cell.r - startRow][cell.c - startCol]) {
                    t = 1;
                }
            }

            // Add "Probabilistic" noise around the digit
            // Cells near the digit might flicker
            if (t === 0 && Math.random() < 0.005) t = 0.3; // Stray pixels

            cell.targetValue = t;
        });
    } else {
        // Fade out
        grid.forEach(cell => cell.targetValue = 0);
    }

    // Update and Draw
    grid.forEach(cell => {
        cell.update();
        cell.draw(gridOffsetX, gridOffsetY, CELL_SIZE);
    });

    requestAnimationFrame(animate);
}

// Init
initGrid();
resize();
requestAnimationFrame(animate);

// ----------------------------------------------------------------
// EXISTING UI LOGIC (Music, Scroll sticky, etc.) - KEPT INTACT
// ----------------------------------------------------------------

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

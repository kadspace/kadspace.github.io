document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded - Initializing Grid System...");

    const canvas = document.getElementById('neural-canvas');
    if (!canvas) {
        console.error("Canvas element not found!");
        return;
    }
    const ctx = canvas.getContext('2d');

    let width, height;
    let grid = [];
    const GRID_COLS = 28;
    const GRID_ROWS = 28;
    let CELL_SIZE = 20;
    let gridOffsetX = 0;
    let gridOffsetY = 0;

    // Digits 0-9 (5x7 bitmaps)
    const DIGIT_BITMAPS = {
        0: [[0, 1, 1, 1, 0], [1, 0, 0, 0, 1], [1, 0, 0, 1, 1], [1, 0, 1, 0, 1], [1, 1, 0, 0, 1], [1, 0, 0, 0, 1], [0, 1, 1, 1, 0]],
        1: [[0, 0, 1, 0, 0], [0, 1, 1, 0, 0], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [0, 1, 1, 1, 0]],
        2: [[0, 1, 1, 1, 0], [1, 0, 0, 0, 1], [0, 0, 0, 0, 1], [0, 0, 0, 1, 0], [0, 0, 1, 0, 0], [0, 1, 0, 0, 0], [1, 1, 1, 1, 1]],
        3: [[1, 1, 1, 1, 0], [0, 0, 0, 0, 1], [0, 0, 0, 1, 0], [0, 0, 1, 1, 0], [0, 0, 0, 0, 1], [1, 0, 0, 0, 1], [0, 1, 1, 1, 0]],
        4: [[0, 0, 0, 1, 0], [0, 0, 1, 1, 0], [0, 1, 0, 1, 0], [1, 0, 0, 1, 0], [1, 1, 1, 1, 1], [0, 0, 0, 1, 0], [0, 0, 0, 1, 0]],
        5: [[1, 1, 1, 1, 1], [1, 0, 0, 0, 0], [1, 1, 1, 1, 0], [0, 0, 0, 0, 1], [0, 0, 0, 0, 1], [1, 0, 0, 0, 1], [0, 1, 1, 1, 0]],
        6: [[0, 1, 1, 1, 0], [1, 0, 0, 0, 0], [1, 0, 0, 0, 0], [1, 1, 1, 1, 0], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [0, 1, 1, 1, 0]],
        7: [[1, 1, 1, 1, 1], [0, 0, 0, 0, 1], [0, 0, 0, 0, 1], [0, 0, 0, 1, 0], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0]],
        8: [[0, 1, 1, 1, 0], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [0, 1, 1, 1, 0], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [0, 1, 1, 1, 0]],
        9: [[0, 1, 1, 1, 0], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [0, 1, 1, 1, 1], [0, 0, 0, 0, 1], [0, 0, 0, 0, 1], [0, 1, 1, 1, 0]]
    };

    const CONFIG = {
        color: { r: 0, g: 255, b: 157 },
        predictionInterval: 3000,
        fadeSpeed: 0.1
    };

    let lastPredictionTime = 0;
    let currentDigit = -1;

    // Scroll Handler
    window.addEventListener('scroll', () => {
        const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
        CONFIG.color.r = Math.floor(0 + (220 * scrollPercent));
        CONFIG.color.g = 255;
        CONFIG.color.b = Math.floor(157 - (107 * scrollPercent));

        document.documentElement.style.setProperty('--accent', `rgb(${CONFIG.color.r}, ${CONFIG.color.g}, ${CONFIG.color.b})`);
        document.documentElement.style.setProperty('--accent-glow', `rgba(${CONFIG.color.r}, ${CONFIG.color.g}, ${CONFIG.color.b}, 0.2)`);

        const blurAmount = Math.min(3, Math.floor(scrollPercent * 5));
        canvas.style.filter = `blur(${blurAmount}px)`;
    });

    class Cell {
        constructor(c, r) {
            this.c = c;
            this.r = r;
            this.value = 0;
            this.targetValue = 0;
        }

        update() {
            this.value += (this.targetValue - this.value) * CONFIG.fadeSpeed;
            if (Math.abs(this.targetValue - this.value) < 0.01) this.value = this.targetValue;
        }

        draw(xOffset, yOffset, size) {
            if (this.value < 0.01) return;

            const x = xOffset + this.c * size;
            const y = yOffset + this.r * size;
            const padding = size * 0.1;

            // DRAW BRIGHTER
            const alpha = this.value * 0.8; // Boost opacity
            ctx.fillStyle = `rgba(${CONFIG.color.r}, ${CONFIG.color.g}, ${CONFIG.color.b}, ${alpha})`;
            ctx.fillRect(x + padding, y + padding, size - padding * 2, size - padding * 2);

            if (this.value > 0.5) {
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`; // Start converting to white core for pop
                ctx.fillRect(x + padding + 2, y + padding + 2, size - padding * 2 - 4, size - padding * 2 - 4);
            }
        }
    }

    function initGrid() {
        grid = [];
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                grid.push(new Cell(c, r));
            }
        }
        console.log(`Grid initialized with ${grid.length} cells`);
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width; // Standard
        canvas.height = height;

        // Force visible positioning for testing if needed, but stick to design
        if (width > 768) {
            // Desktop: Align right
            CELL_SIZE = Math.min(width * 0.4 / GRID_COLS, height * 0.8 / GRID_ROWS);
            CELL_SIZE = Math.max(CELL_SIZE, 15);
            gridOffsetX = width * 0.6; // 60% across
            gridOffsetY = (height - (GRID_ROWS * CELL_SIZE)) / 2;
        } else {
            // Mobile: Align center
            CELL_SIZE = Math.min(width * 0.9 / GRID_COLS, height * 0.5 / GRID_ROWS);
            gridOffsetX = (width - (GRID_COLS * CELL_SIZE)) / 2;
            gridOffsetY = height * 0.2;
        }
        console.log(`Canvas resized: ${width}x${height}. Grid Offset: ${gridOffsetX}, ${gridOffsetY}. Cell Size: ${CELL_SIZE}`);
    }

    window.addEventListener('resize', () => {
        resize();
        initGrid();
    });

    function getDigitTarget(digit) {
        const map = new Array(GRID_ROWS * GRID_COLS).fill(0);
        if (digit === -1) return map;

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

        if (timestamp - lastPredictionTime > CONFIG.predictionInterval) {
            lastPredictionTime = timestamp;
            currentDigit = Math.floor(Math.random() * 10);
            console.log(`New prediction cycle: Digit ${currentDigit}`);
        }

        const progress = (timestamp - lastPredictionTime) / CONFIG.predictionInterval;
        let phase = "";

        if (progress < 0.2) {
            phase = "noise";
            grid.forEach(cell => {
                if (Math.random() < 0.1) cell.targetValue = Math.random() * 0.5;
                else cell.targetValue = 0;
            });
        } else if (progress < 0.8) {
            phase = "resolve";
            const bitmap = DIGIT_BITMAPS[currentDigit];
            const bitmapH = bitmap.length;
            const bitmapW = bitmap[0].length;
            const startRow = Math.floor((GRID_ROWS - bitmapH) / 2);
            const startCol = Math.floor((GRID_COLS - bitmapW) / 2);

            grid.forEach(cell => {
                let t = 0;
                if (cell.r >= startRow && cell.r < startRow + bitmapH &&
                    cell.c >= startCol && cell.c < startCol + bitmapW) {
                    try {
                        if (bitmap[cell.r - startRow][cell.c - startCol]) t = 1;
                    } catch (e) { }
                }

                // Noise around digit (flicker)
                if (t === 0 && Math.random() < 0.005) t = 0.4;
                cell.targetValue = t;
            });
        } else {
            phase = "fade";
            grid.forEach(cell => cell.targetValue = 0);
        }

        grid.forEach(cell => {
            cell.update();
            cell.draw(gridOffsetX, gridOffsetY, CELL_SIZE);
        });

        requestAnimationFrame(animate);
    }

    // Start
    initGrid();
    resize();
    requestAnimationFrame(animate);

    // Audio Player Logic (Wrapped in DOMContentLoaded to be safe)
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

    if (playBtn && audio) {
        playBtn.addEventListener('click', () => {
            if (audio.paused) {
                audio.play().then(() => playBtn.classList.add('is-playing')).catch(e => console.error(e));
            } else {
                audio.pause();
                playBtn.classList.remove('is-playing');
            }
        });

        audio.addEventListener('loadedmetadata', () => {
            if (durationEl) durationEl.innerText = formatTime(audio.duration);
        });

        audio.addEventListener('timeupdate', () => {
            if (audio.duration && progressBar) {
                const percent = (audio.currentTime / audio.duration) * 100;
                if (!isDragging) progressBar.style.width = `${percent}%`;
                if (currentTimeEl) currentTimeEl.innerText = formatTime(audio.currentTime);
            }
        });

        // Simplified scrubbing/volume listeners for brevity...
        window.addEventListener('mouseup', () => { isDragging = false; isVolDragging = false; });
    }
});

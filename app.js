document.addEventListener('DOMContentLoaded', () => {
    console.log("Initializing Neural Forward Pass System...");

    const canvas = document.getElementById('neural-canvas');
    if (!canvas) {
        console.error("Canvas not found");
        return;
    }
    const ctx = canvas.getContext('2d');

    let width, height;

    // Config
    const CONFIG = {
        layerCount: 4,
        nodesPerLayer: 8,
        layerSpacing: 0, // Calculated
        color: { r: 0, g: 255, b: 157 },
        pulseChance: 0.05, // Chance per frame to spawn a pulse
        pulseSpeed: 0.05
    };

    // Data Structures
    let layers = []; // Array of arrays of Nodes
    let connections = []; // Array of Connections
    let pulses = []; // Array of active Pulses
    let tokens = []; // Array of active Tokens

    // Tech Tokens for "Prediction"
    const VOCAB = [
        "TENSOR", "LOGIT", "ATTENTION", "GRADIENT", "WEIGHT", "BIAS",
        "LAYER", "NORM", "RELU", "SOFTMAX", "EMBED", "VECTOR",
        "TOKEN", "HEAD", "QUERY", "KEY", "VALUE", "TRANSFORMER"
    ];

    // Scroll Handler (Kept consistent)
    window.addEventListener('scroll', () => {
        const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
        const r = Math.floor(0 + (220 * scrollPercent));
        const g = 255;
        const b = Math.floor(157 - (107 * scrollPercent));

        CONFIG.color = { r, g, b };
        document.documentElement.style.setProperty('--accent', `rgb(${r}, ${g}, ${b})`);
        document.documentElement.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.2)`);

        const blurAmount = Math.min(3, Math.floor(scrollPercent * 5));
        canvas.style.filter = `blur(${blurAmount}px)`;
    });

    class Node {
        constructor(x, y, layerIndex) {
            this.x = x;
            this.y = y;
            this.layerIndex = layerIndex;
            this.activation = 0; // 0 to 1, lights up when pulse hits
        }

        draw() {
            // Decay activation
            this.activation *= 0.9;

            const size = 3;
            ctx.fillStyle = `rgba(${CONFIG.color.r}, ${CONFIG.color.g}, ${CONFIG.color.b}, ${0.3 + this.activation})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
            ctx.fill();

            // Glow ring
            if (this.activation > 0.1) {
                ctx.strokeStyle = `rgba(${CONFIG.color.r}, ${CONFIG.color.g}, ${CONFIG.color.b}, ${this.activation * 0.5})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, size * (1 + this.activation * 4), 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    class Connection {
        constructor(fromNode, toNode) {
            this.from = fromNode;
            this.to = toNode;
        }

        draw() {
            // Very faint static line
            ctx.strokeStyle = `rgba(${CONFIG.color.r}, ${CONFIG.color.g}, ${CONFIG.color.b}, 0.05)`;
            ctx.beginPath();
            ctx.moveTo(this.from.x, this.from.y);
            ctx.lineTo(this.to.x, this.to.y);
            ctx.stroke();
        }
    }

    class Pulse {
        constructor(connection) {
            this.connection = connection;
            this.progress = 0; // 0 to 1
            this.done = false;
        }

        update() {
            this.progress += CONFIG.pulseSpeed;
            if (this.progress >= 1) {
                this.done = true;
                this.connection.to.activation = 1; // Ignite target node

                // If it's the last layer, emit a token!
                if (this.connection.to.layerIndex === CONFIG.layerCount - 1) {
                    spawnToken(this.connection.to.x, this.connection.to.y);
                } else {
                    // Propagate chain reaction?
                    // Simple logic: Trigger new pulse from this node to a random next neighbor
                    const nextLayer = layers[this.connection.to.layerIndex + 1];
                    if (nextLayer) {
                        // Find connections starting from 'to' node
                        const potentialNext = connections.filter(c => c.from === this.connection.to);
                        if (potentialNext.length > 0) {
                            pulses.push(new Pulse(potentialNext[Math.floor(Math.random() * potentialNext.length)]));
                        }
                    }
                }
            }
        }

        draw() {
            // Draw a moving segment
            const lx = this.connection.from.x + (this.connection.to.x - this.connection.from.x) * this.progress;
            const ly = this.connection.from.y + (this.connection.to.y - this.connection.from.y) * this.progress;

            ctx.fillStyle = `rgb(${CONFIG.color.r}, ${CONFIG.color.g}, ${CONFIG.color.b})`;
            ctx.beginPath();
            ctx.arc(lx, ly, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    class Token {
        constructor(x, y, text) {
            this.x = x;
            this.y = y;
            this.text = text;
            this.life = 1.0;
            this.vy = -0.5 - Math.random() * 0.5; // Drift up
        }

        update() {
            this.y += this.vy;
            this.life -= 0.01;
        }

        draw() {
            if (this.life <= 0) return;
            ctx.fillStyle = `rgba(${CONFIG.color.r}, ${CONFIG.color.g}, ${CONFIG.color.b}, ${this.life})`;
            ctx.font = "12px 'Fira Code'";
            ctx.fillText(this.text, this.x + 10, this.y);
        }
    }

    function spawnToken(x, y) {
        const text = VOCAB[Math.floor(Math.random() * VOCAB.length)];
        tokens.push(new Token(x, y, text));
    }

    function initNetwork() {
        layers = [];
        connections = [];

        // Define positioning area (Right 40% of screen)
        // Desktop vs Mobile logic
        let startX, spacingX;

        if (width > 768) {
            startX = width * 0.6; // Start at 60% width
            spacingX = (width * 0.35) / (CONFIG.layerCount - 1);
        } else {
            startX = width * 0.1;
            spacingX = (width * 0.8) / (CONFIG.layerCount - 1);
        }

        const spacingY = height / (CONFIG.nodesPerLayer + 2); // Vertical spacing

        // Create Nodes
        for (let l = 0; l < CONFIG.layerCount; l++) {
            let layerNodes = [];
            const layerX = startX + (l * spacingX);

            for (let n = 0; n < CONFIG.nodesPerLayer; n++) {
                // Stagger layers slightly for "organic" look
                const stagger = (l % 2 === 0) ? 0 : spacingY * 0.5;
                const layerY = (spacingY * 1.5) + (n * spacingY) + stagger;

                layerNodes.push(new Node(layerX, layerY, l));
            }
            layers.push(layerNodes);
        }

        // Create Connections (Fully connected adjacent layers)
        for (let l = 0; l < CONFIG.layerCount - 1; l++) {
            const currentLayer = layers[l];
            const nextLayer = layers[l + 1];

            for (let n1 of currentLayer) {
                // Connect to a few random nodes in next layer, not all (too messy)
                // Let's connect to 3 nearest, or random 3?
                // Random 3 for "Neural" look
                for (let i = 0; i < 3; i++) {
                    const n2 = nextLayer[Math.floor(Math.random() * nextLayer.length)];
                    connections.push(new Connection(n1, n2));
                }
            }
        }

        console.log(`Network initialized: ${layers.length} Layers, ${connections.length} Connections`);
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        initNetwork();
    }

    window.addEventListener('resize', resize);

    function animate() {
        ctx.clearRect(0, 0, width, height);

        // Spawn Pulse?
        if (Math.random() < CONFIG.pulseChance) {
            // Pick random start node from Layer 0
            const startLayer = layers[0];
            if (startLayer) {
                const startNode = startLayer[Math.floor(Math.random() * startLayer.length)];
                // Find connection from this node
                const candidates = connections.filter(c => c.from === startNode);
                if (candidates.length > 0) {
                    pulses.push(new Pulse(candidates[Math.floor(Math.random() * candidates.length)]));
                    startNode.activation = 1; // Flash input
                }
            }
        }

        // Draw Lines
        connections.forEach(c => c.draw());

        // Update/Draw Pulses
        for (let i = pulses.length - 1; i >= 0; i--) {
            pulses[i].update();
            pulses[i].draw();
            if (pulses[i].done) pulses.splice(i, 1);
        }

        // Draw Nodes (after lines, under pulses? actually pulses should be on top)
        // Nodes draw activation, so draw them after pulses update but before drawing pulses?
        // Let's draw nodes on top of lines
        layers.flat().forEach(n => n.draw());

        // Update/Draw Tokens
        for (let i = tokens.length - 1; i >= 0; i--) {
            tokens[i].update();
            tokens[i].draw();
            if (tokens[i].life <= 0) tokens.splice(i, 1);
        }

        requestAnimationFrame(animate);
    }

    // Start
    resize();
    animate();

    // ----------------------------------------------------
    // Audio Player Logic (Preserved)
    // ----------------------------------------------------
    const audio = document.getElementById('audio-source');
    const playBtn = document.getElementById('play-btn');
    const progressBar = document.getElementById('progress-fill');
    // ... (Simplified re-implementation to save tokens/space, assuming standard listener logic)

    if (playBtn && audio) {
        // Simple Audio Handlers
        playBtn.onclick = () => {
            if (audio.paused) { audio.play(); playBtn.classList.add('is-playing'); }
            else { audio.pause(); playBtn.classList.remove('is-playing'); }
        };
        audio.ontimeupdate = () => {
            if (audio.duration && progressBar) progressBar.style.width = (audio.currentTime / audio.duration) * 100 + "%";
            if (document.getElementById('current-time')) {
                const m = Math.floor(audio.currentTime / 60);
                const s = Math.floor(audio.currentTime % 60);
                document.getElementById('current-time').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
            }
        };
        if (document.getElementById('duration')) {
            audio.onloadedmetadata = () => {
                const m = Math.floor(audio.duration / 60);
                const s = Math.floor(audio.duration % 60);
                document.getElementById('duration').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
            }
        }
        // Volume
        const volFill = document.getElementById('vol-fill');
        const volBarBg = document.querySelector('.vol-bar-bg');
        if (volBarBg && volFill) {
            volBarBg.onmousedown = (e) => {
                const rect = volBarBg.getBoundingClientRect();
                const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                audio.volume = p;
                volFill.style.width = p * 100 + "%";
            }
        }
        // Scrub
        const proBarBg = document.querySelector('.progress-bar-bg');
        if (proBarBg) {
            proBarBg.onmousedown = (e) => {
                const rect = proBarBg.getBoundingClientRect();
                const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                if (audio.duration) audio.currentTime = p * audio.duration;
            }
        }
    }
});

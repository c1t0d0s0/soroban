document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const questionElement = document.getElementById('question');
    const resultArea = document.getElementById('result-area');
    const resultBadge = document.getElementById('result-badge');
    const resultDetail = document.getElementById('result-detail');
    const countdownBar = document.getElementById('countdown-bar');
    const countdownText = document.getElementById('countdown-text');
    const checkButton = document.getElementById('check-button');
    const clearButton = document.getElementById('clear-button');
    const newQuestionButton = document.getElementById('new-question-button');
    const sorobanElement = document.getElementById('soroban');
    const currentSorobanValEl = document.getElementById('current-soroban-val');
    const starCountEl = document.getElementById('star-count');
    const streakCountEl = document.getElementById('streak-count');
    const soundToggleBtn = document.getElementById('sound-toggle');
    const soundIconEl = document.getElementById('sound-icon');
    const levelBtns = document.querySelectorAll('.level-btn');
    const canvas = document.getElementById('confetti-canvas');

    // App State
    let currentAnswer = 0;
    let maxDigits = 2; // Default max digits: 2 digits (1〜2けた)
    let starCount = 0;
    let streakCount = 0;
    let autoNextTimeout = null;
    let countdownInterval = null;
    let isSoundMuted = false;
    const NUM_RODS = 5;

    // --- Web Audio API Wood Bead Synthesizer ---
    let audioCtx = null;
    let noiseBuffer = null;

    function getAudioContext() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioCtx = new AudioContext();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        // Lazily initialize reusable noise buffer for high-frequency wood impact transients
        if (audioCtx && !noiseBuffer) {
            const sampleRate = audioCtx.sampleRate || 44100;
            const length = Math.floor(sampleRate * 0.05); // 50ms noise buffer
            noiseBuffer = audioCtx.createBuffer(1, length, sampleRate);
            const data = noiseBuffer.getChannelData(0);
            for (let i = 0; i < length; i++) {
                data[i] = Math.random() * 2 - 1;
            }
        }
        return audioCtx;
    }

    /**
     * Synthesizes a single authentic wooden bead impact sound using physical modal resonance.
     */
    function playSingleWoodClick(ctx, startTime, options = {}) {
        const pitchMult = (options.pitchMult || 1.0) * (0.97 + Math.random() * 0.06);
        const volume = options.volume || 1.0;
        const isBeamHit = options.isBeamHit !== undefined ? options.isBeamHit : true;

        // 1. High-frequency Snap / Attack Noise Transient (hard wood contact snap)
        if (noiseBuffer) {
            const noiseSource = ctx.createBufferSource();
            noiseSource.buffer = noiseBuffer;

            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime((isBeamHit ? 4200 : 3600) * pitchMult, startTime);
            noiseFilter.Q.setValueAtTime(3.2, startTime);

            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.42 * volume, startTime);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.012);

            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(ctx.destination);

            noiseSource.start(startTime);
            noiseSource.stop(startTime + 0.015);
        }

        // 2. High Wood Mode (Hard surface collision click)
        const oscHigh = ctx.createOscillator();
        const gainHigh = ctx.createGain();
        const fHighBase = (isBeamHit ? 2700 : 2300) * pitchMult;

        oscHigh.type = 'sine';
        oscHigh.frequency.setValueAtTime(fHighBase * 1.45, startTime);
        oscHigh.frequency.exponentialRampToValueAtTime(fHighBase, startTime + 0.006);

        gainHigh.gain.setValueAtTime(0.40 * volume, startTime);
        gainHigh.gain.exponentialRampToValueAtTime(0.001, startTime + 0.020);

        oscHigh.connect(gainHigh);
        gainHigh.connect(ctx.destination);
        oscHigh.start(startTime);
        oscHigh.stop(startTime + 0.024);

        // 3. Mid Wood Body Resonance ("tok" / "kachi")
        const oscMid = ctx.createOscillator();
        const gainMid = ctx.createGain();
        const fMidBase = (isBeamHit ? 1350 : 1150) * pitchMult;

        oscMid.type = 'sine';
        oscMid.frequency.setValueAtTime(fMidBase * 1.30, startTime);
        oscMid.frequency.exponentialRampToValueAtTime(fMidBase, startTime + 0.009);

        gainMid.gain.setValueAtTime(0.35 * volume, startTime);
        gainMid.gain.exponentialRampToValueAtTime(0.001, startTime + 0.028);

        oscMid.connect(gainMid);
        gainMid.connect(ctx.destination);
        oscMid.start(startTime);
        oscMid.stop(startTime + 0.032);

        // 4. Low Wood Thud / Frame Box Resonance ("pok")
        const oscLow = ctx.createOscillator();
        const gainLow = ctx.createGain();
        const fLowBase = (isBeamHit ? 580 : 490) * pitchMult;

        oscLow.type = 'triangle';
        oscLow.frequency.setValueAtTime(fLowBase * 1.25, startTime);
        oscLow.frequency.exponentialRampToValueAtTime(fLowBase, startTime + 0.012);

        gainLow.gain.setValueAtTime(0.22 * volume, startTime);
        gainLow.gain.exponentialRampToValueAtTime(0.001, startTime + 0.036);

        oscLow.connect(gainLow);
        gainLow.connect(ctx.destination);
        oscLow.start(startTime);
        oscLow.stop(startTime + 0.040);
    }

    /**
     * Plays the bead click sound, with micro-staggering when multiple beads move together.
     */
    function playBeadClickSound(beadCount = 1, options = {}) {
        if (isSoundMuted) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const count = Math.max(1, Math.min(4, beadCount));

            for (let i = 0; i < count; i++) {
                // Micro-staggering for multi-bead impacts (8-14ms apart)
                const delay = i * (0.009 + Math.random() * 0.004);
                const isMainImpact = (i === count - 1) || (count === 1);
                const volume = isMainImpact ? 1.0 : 0.65;
                const rodPitchShift = (options.rodIndex !== undefined) ? (1.0 + (options.rodIndex - 2) * 0.025) : 1.0;
                const beadPitchShift = 1.0 + (i * 0.035);

                playSingleWoodClick(ctx, now + delay, {
                    pitchMult: rodPitchShift * beadPitchShift * (options.pitchMult || 1.0),
                    volume: volume * (options.volume || 1.0),
                    isBeamHit: options.isBeamHit !== undefined ? options.isBeamHit : true
                });
            }
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Plays the traditional "ご破算" (gohasan) wooden sweep sound when clearing the board.
     */
    function playClearSweepSound(count = 5) {
        if (isSoundMuted) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const sweepCount = Math.min(8, Math.max(3, count));
            for (let i = 0; i < sweepCount; i++) {
                const delay = i * (0.018 + Math.random() * 0.005);
                const pitchMult = 0.88 + (i * 0.05) + (Math.random() - 0.5) * 0.06;
                const volume = 0.5 + Math.random() * 0.2;

                playSingleWoodClick(ctx, now + delay, {
                    pitchMult: pitchMult,
                    volume: volume,
                    isBeamHit: false
                });
            }
        } catch (e) {
            console.error(e);
        }
    }

    function playCorrectSound() {
        if (isSoundMuted) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            notes.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const startTime = ctx.currentTime + index * 0.08;

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, startTime);

                gain.gain.setValueAtTime(0.25, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + 0.25);
            });
        } catch (e) {
            console.error(e);
        }
    }

    function playIncorrectSound() {
        if (isSoundMuted) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const notes = [311.13, 277.18]; // Eb4, Db4
            notes.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const startTime = ctx.currentTime + index * 0.15;

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, startTime);

                gain.gain.setValueAtTime(0.15, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + 0.2);
            });
        } catch (e) {
            console.error(e);
        }
    }

    // Toggle Sound
    soundToggleBtn.addEventListener('click', () => {
        isSoundMuted = !isSoundMuted;
        soundIconEl.textContent = isSoundMuted ? '🔇' : '🔊';
    });

    // --- Soroban UI & Physics Logic ---
    function createSoroban() {
        sorobanElement.innerHTML = '';
        for (let i = 0; i < NUM_RODS; i++) {
            const rod = document.createElement('div');
            rod.className = 'rod';

            // Traditional positioning points on rod 2 (thousands) and rod 4 (ones)
            if (i === 2 || i === 4) {
                rod.classList.add('positioning-point');
            }

            // Heaven Bead (5-value)
            const heavenBead = document.createElement('div');
            heavenBead.className = 'bead heaven-bead';
            heavenBead.dataset.value = 5;
            heavenBead.addEventListener('click', handleBeadClick);
            rod.appendChild(heavenBead);

            // Earth Beads Container (1-values)
            const earthBeadsContainer = document.createElement('div');
            earthBeadsContainer.className = 'earth-beads';
            for (let j = 0; j < 4; j++) {
                const earthBead = document.createElement('div');
                earthBead.className = 'bead earth-bead';
                earthBead.dataset.value = 1;
                earthBead.addEventListener('click', handleBeadClick);
                earthBeadsContainer.appendChild(earthBead);
            }
            rod.appendChild(earthBeadsContainer);
            sorobanElement.appendChild(rod);
        }
        updateSorobanValueDisplay();
    }

    function handleBeadClick(event) {
        getAudioContext(); // Ensure AudioContext is initialized on click

        const clickedBead = event.currentTarget;
        const rod = clickedBead.closest('.rod');
        const rods = Array.from(sorobanElement.querySelectorAll('.rod'));
        const rodIndex = rods.indexOf(rod);
        const isActive = clickedBead.classList.contains('active');

        let movedCount = 0;
        let isBeamHit = true;

        if (clickedBead.classList.contains('heaven-bead')) {
            clickedBead.classList.toggle('active');
            isBeamHit = !isActive; // If previously inactive, moving toward beam
            movedCount = 1;
        } else if (clickedBead.classList.contains('earth-bead')) {
            const earthBeads = Array.from(rod.querySelectorAll('.earth-bead'));
            const clickedIndex = earthBeads.indexOf(clickedBead);

            if (isActive) {
                // Deactivate this bead and all beads below it (slide away from beam)
                isBeamHit = false;
                for (let i = clickedIndex; i < earthBeads.length; i++) {
                    if (earthBeads[i].classList.contains('active')) {
                        movedCount++;
                        earthBeads[i].classList.remove('active');
                    }
                }
            } else {
                // Activate this bead and all beads above it (slide toward beam)
                isBeamHit = true;
                for (let i = 0; i <= clickedIndex; i++) {
                    if (!earthBeads[i].classList.contains('active')) {
                        movedCount++;
                        earthBeads[i].classList.add('active');
                    }
                }
            }
        }

        if (movedCount === 0) movedCount = 1;
        playBeadClickSound(movedCount, { rodIndex, isBeamHit });
        updateSorobanValueDisplay();
    }

    function getSorobanValue() {
        let totalValue = 0;
        const rods = sorobanElement.querySelectorAll('.rod');
        rods.forEach((rod, index) => {
            let rodValue = 0;
            const beads = rod.querySelectorAll('.bead');
            beads.forEach(bead => {
                if (bead.classList.contains('active')) {
                    rodValue += parseInt(bead.dataset.value, 10);
                }
            });
            const power = rods.length - 1 - index;
            totalValue += rodValue * Math.pow(10, power);
        });
        return totalValue;
    }

    function updateSorobanValueDisplay() {
        const val = getSorobanValue();
        currentSorobanValEl.textContent = val.toLocaleString('ja-JP');
    }

    function clearSoroban(playSound = false) {
        const beads = sorobanElement.querySelectorAll('.bead.active');
        const activeCount = beads.length;
        beads.forEach(bead => bead.classList.remove('active'));
        updateSorobanValueDisplay();

        if (playSound && activeCount > 0) {
            getAudioContext();
            playClearSweepSound(activeCount);
        }
    }

    // --- Question Generation Engine ---
    function generateQuestion() {
        clearCountdownTimer();

        let maxVal = 99999;
        let minVal = 10;
        if (maxDigits === 2) {
            maxVal = 99;
            minVal = 5;
        } else if (maxDigits === 3 || maxDigits === 4) {
            maxVal = 9999;
            minVal = 100;
        }

        const getRandomNumber = (max, min = 1) => {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        };

        const isAddition = Math.random() < 0.5;
        let num1 = 0;
        let num2 = 0;

        if (isAddition) {
            num1 = getRandomNumber(Math.floor(maxVal * 0.7), minVal);
            num2 = getRandomNumber(maxVal - num1, 1);
            currentAnswer = num1 + num2;
            questionElement.textContent = `${num1.toLocaleString('ja-JP')} + ${num2.toLocaleString('ja-JP')} = ?`;
        } else {
            num1 = getRandomNumber(maxVal, minVal + 5);
            num2 = getRandomNumber(num1 - 1, 1);
            currentAnswer = num1 - num2;
            questionElement.textContent = `${num1.toLocaleString('ja-JP')} - ${num2.toLocaleString('ja-JP')} = ?`;
        }

        // Reset Result View & Button States
        resultArea.classList.add('hidden');
        checkButton.disabled = false;
        newQuestionButton.disabled = true;
        clearSoroban();
    }

    // --- Level Selection ---
    levelBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            levelBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            maxDigits = parseInt(e.target.dataset.digits, 10);
            generateQuestion();
        });
    });

    // --- Countdown & Timer Management ---
    function clearCountdownTimer() {
        if (autoNextTimeout) {
            clearTimeout(autoNextTimeout);
            autoNextTimeout = null;
        }
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
    }

    function startAutoNextTimer() {
        clearCountdownTimer();

        const durationMs = 3000;
        const startTime = Date.now();
        countdownBar.style.width = '100%';

        countdownInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remainingRatio = Math.max(0, 1 - (elapsed / durationMs));
            countdownBar.style.width = `${remainingRatio * 100}%`;
            
            const secondsLeft = Math.ceil((durationMs - elapsed) / 1000);
            if (secondsLeft > 0) {
                countdownText.textContent = `${secondsLeft}秒ごにつぎのもんだいにいくよ！`;
            }
        }, 50);

        autoNextTimeout = setTimeout(() => {
            clearCountdownTimer();
            generateQuestion();
        }, durationMs);
    }

    // --- Check Answer Logic ("できた！" Button) ---
    function checkAnswer() {
        getAudioContext();
        const userVal = getSorobanValue();
        resultArea.classList.remove('hidden', 'correct-style', 'incorrect-style');

        if (userVal === currentAnswer) {
            // Correct Answer!
            resultArea.classList.add('correct-style');
            resultBadge.textContent = 'せいかい！🎉';
            resultDetail.textContent = `すごーい！ぴったりの ${currentAnswer.toLocaleString('ja-JP')} だよ！`;
            
            starCount++;
            streakCount++;
            starCountEl.textContent = starCount;
            streakCountEl.textContent = streakCount;

            playCorrectSound();
            launchConfetti();
        } else {
            // Incorrect Answer
            resultArea.classList.add('incorrect-style');
            resultBadge.textContent = 'おしい！もういちど！🤔';
            resultDetail.textContent = `せいかいは ${currentAnswer.toLocaleString('ja-JP')} だよ (きみのそろばん: ${userVal.toLocaleString('ja-JP')})`;

            streakCount = 0;
            streakCountEl.textContent = streakCount;

            playIncorrectSound();
        }

        checkButton.disabled = true;
        newQuestionButton.disabled = false;
        startAutoNextTimer();
    }

    // --- Confetti Particle System ---
    function launchConfetti() {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#2ed573', '#a855f7'];

        for (let i = 0; i < 60; i++) {
            particles.push({
                x: canvas.width / 2,
                y: canvas.height / 2,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.7) * 12,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rSpeed: (Math.random() - 0.5) * 10
            });
        }

        let animationFrame;
        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let alive = false;

            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.25; // gravity
                p.rotation += p.rSpeed;

                if (p.y < canvas.height) {
                    alive = true;
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate((p.rotation * Math.PI) / 180);
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                    ctx.restore();
                }
            });

            if (alive) {
                animationFrame = requestAnimationFrame(render);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                cancelAnimationFrame(animationFrame);
            }
        };
        render();
    }

    // Event Listeners
    checkButton.addEventListener('click', checkAnswer);
    clearButton.addEventListener('click', () => {
        clearSoroban(true);
    });
    newQuestionButton.addEventListener('click', () => {
        if (newQuestionButton.disabled) return;
        getAudioContext();
        generateQuestion();
    });

    // Handle Window Resize
    window.addEventListener('resize', () => {
        if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
    });

    // --- Initial Setup ---
    createSoroban();
    generateQuestion();
});

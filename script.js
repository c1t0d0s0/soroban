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
    let maxDigits = 5; // Default max digits: 5 digits (up to 99999)
    let starCount = 0;
    let streakCount = 0;
    let autoNextTimeout = null;
    let countdownInterval = null;
    let isSoundMuted = false;
    const NUM_RODS = 5;

    // --- Web Audio API Synthesizer ---
    let audioCtx = null;

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
        return audioCtx;
    }

    function playBeadClickSound() {
        if (isSoundMuted) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400 + Math.random() * 200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.04);

            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.04);
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
        playBeadClickSound();

        const clickedBead = event.currentTarget;
        const rod = clickedBead.closest('.rod');
        const isActive = clickedBead.classList.contains('active');

        if (clickedBead.classList.contains('heaven-bead')) {
            clickedBead.classList.toggle('active');
        } else if (clickedBead.classList.contains('earth-bead')) {
            const earthBeads = Array.from(rod.querySelectorAll('.earth-bead'));
            const clickedIndex = earthBeads.indexOf(clickedBead);

            if (isActive) {
                // Deactivate this bead and all beads below it
                for (let i = clickedIndex; i < earthBeads.length; i++) {
                    earthBeads[i].classList.remove('active');
                }
            } else {
                // Activate this bead and all beads above it
                for (let i = 0; i <= clickedIndex; i++) {
                    earthBeads[i].classList.add('active');
                }
            }
        }
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

    function clearSoroban() {
        const beads = sorobanElement.querySelectorAll('.bead.active');
        beads.forEach(bead => bead.classList.remove('active'));
        updateSorobanValueDisplay();
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

        // Reset Result View
        resultArea.classList.add('hidden');
        checkButton.disabled = false;
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
    clearButton.addEventListener('click', clearSoroban);
    newQuestionButton.addEventListener('click', () => {
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

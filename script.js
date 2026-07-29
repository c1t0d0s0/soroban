document.addEventListener('DOMContentLoaded', () => {
    const questionElement = document.getElementById('question');
    const resultElement = document.getElementById('result');
    const checkButton = document.getElementById('check-button');
    const sorobanElement = document.getElementById('soroban');
    const newQuestionButton = document.getElementById('new-question-button');

    let currentAnswer = 0;
    const NUM_RODS = 5;

    // --- Soroban Creation ---
    function createSoroban() {
        sorobanElement.innerHTML = ''; // Clear existing soroban
        for (let i = 0; i < NUM_RODS; i++) {
            const rod = document.createElement('div');
            rod.className = 'rod';

            // Add positioning point every 3 rods from the right, starting at the units place
            if ((NUM_RODS - i) % 3 === 1 && (NUM_RODS - i) > 1) {
                 rod.classList.add('positioning-point');
            }

            const heavenBead = document.createElement('div');
            heavenBead.className = 'bead heaven-bead';
            heavenBead.dataset.value = 5;
            heavenBead.addEventListener('click', moveBead);
            rod.appendChild(heavenBead);

            const earthBeadsContainer = document.createElement('div');
            earthBeadsContainer.className = 'earth-beads';
            for (let j = 0; j < 4; j++) {
                const earthBead = document.createElement('div');
                earthBead.className = 'bead earth-bead';
                earthBead.dataset.value = 1;
                earthBead.addEventListener('click', moveBead);
                earthBeadsContainer.appendChild(earthBead);
            }
            rod.appendChild(earthBeadsContainer);
            sorobanElement.appendChild(rod);
        }
    }

    // --- Bead Logic ---
    function moveBead(event) {
        const clickedBead = event.target.closest('.bead');
        if (!clickedBead) return;

        // Use parentElement to get the rod, not earth-beads container
        const rod = clickedBead.closest('.rod');
        const isActive = clickedBead.classList.contains('active');

        if (clickedBead.classList.contains('heaven-bead')) {
            // Heaven bead logic (simple toggle)
            clickedBead.classList.toggle('active');
        } else if (clickedBead.classList.contains('earth-bead')) {
            // Earth bead logic (move multiple)
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
    }

    function getSorobanValue() {
        let totalValue = 0;
        const rods = sorobanElement.querySelectorAll('.rod');
        rods.forEach((rod, index) => {
            let rodValue = 0;
            const beads = rod.querySelectorAll('.bead');
            beads.forEach(bead => {
                if (bead.classList.contains('active')) {
                    rodValue += parseInt(bead.dataset.value);
                }
            });
            const power = rods.length - 1 - index;
            totalValue += rodValue * Math.pow(10, power);
        });
        return totalValue;
    }
    
    function clearSoroban() {
        const beads = sorobanElement.querySelectorAll('.bead.active');
        beads.forEach(bead => bead.classList.remove('active'));
    }


    // --- Question Logic ---
    function generateQuestion() {
        // Generate a number with 2 to 4 digits
        const generateNumber = () => {
            const digits = Math.floor(Math.random() * 3) + 2; // 2, 3, or 4
            const min = Math.pow(10, digits - 1);
            const max = Math.pow(10, digits) - 1;
            return Math.floor(Math.random() * (max - min + 1)) + min;
        };

        let num1 = generateNumber();
        let num2 = generateNumber();
        
        // 50% chance of addition or subtraction
        const isAddition = Math.random() < 0.5;

        if (isAddition) {
            currentAnswer = num1 + num2;
            questionElement.textContent = `${num1} + ${num2} = ?`;
        } else {
            // Ensure the result is not negative
            if (num1 < num2) {
                [num1, num2] = [num2, num1]; // Swap numbers
            }
            currentAnswer = num1 - num2;
            questionElement.textContent = `${num1} - ${num2} = ?`;
        }

        resultElement.textContent = '答えをそろばんで作ってね';
        resultElement.className = '';
        checkButton.disabled = false;
        clearSoroban();
    }


    // --- Check Answer ---
    function checkAnswer() {
        const sorobanValue = getSorobanValue();
        if (sorobanValue === currentAnswer) {
            resultElement.textContent = '正解！ 🎉';
            resultElement.className = 'correct';
        } else {
            resultElement.textContent = `残念！正解は ${currentAnswer} です。 (そろばんの値: ${sorobanValue})`;
            resultElement.className = 'incorrect';
        }
        checkButton.disabled = true;
    }

    checkButton.addEventListener('click', checkAnswer);
    newQuestionButton.addEventListener('click', generateQuestion);

    // --- Initial Setup ---
    createSoroban();
    generateQuestion();
});

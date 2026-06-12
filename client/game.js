const API_BASE_URL = 'http://localhost:6050/api';

const CARD_EMOJIS = {
  1: '\u{1F338}',
  2: '\u{1F33B}',
  3: '\u{1F339}',
  4: '\u{1F340}',
  5: '\u{1F525}',
  6: '\u{1F48E}',
  7: '\u2B50',
  8: '\u{1F308}'
};

const PREVIEW_DURATION = 3;
const HIDDEN_COUNT_MIN = 2;
const HIDDEN_COUNT_MAX = 4;
const WRONG_COUNT_MIN = 1;
const WRONG_COUNT_MAX = 2;

const gameBoard = document.getElementById('gameBoard');
const timerEl = document.getElementById('timer');
const movesEl = document.getElementById('moves');
const matchedEl = document.getElementById('matched');
const restartBtn = document.getElementById('restartBtn');
const leaderboardBtn = document.getElementById('leaderboardBtn');
const winModal = document.getElementById('winModal');
const leaderboardModal = document.getElementById('leaderboardModal');
const finalTimeEl = document.getElementById('finalTime');
const finalMovesEl = document.getElementById('finalMoves');
const playerNameInput = document.getElementById('playerName');
const submitScoreBtn = document.getElementById('submitScoreBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
const leaderboardList = document.getElementById('leaderboardList');
const previewCountdownEl = document.getElementById('previewCountdown');
const previewCountdownNumberEl = document.getElementById('previewCountdownNumber');

let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let moves = 0;
let timer = null;
let startTime = null;
let elapsedTime = 0;
let gameStarted = false;
let isProcessing = false;
let isPreviewing = false;
let previewTimer = null;
let previewWrongCards = new Set();

async function initGame() {
  resetGameState();
  const shuffledCards = await fetchShuffledCards();
  renderCards(shuffledCards);
  startPreview();
}

function resetGameState() {
  cards = [];
  flippedCards = [];
  matchedPairs = 0;
  moves = 0;
  elapsedTime = 0;
  gameStarted = false;
  isProcessing = false;
  isPreviewing = false;
  previewWrongCards.clear();

  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (previewTimer) {
    clearInterval(previewTimer);
    previewTimer = null;
  }

  updateTimerDisplay();
  movesEl.textContent = '0';
  matchedEl.textContent = '0/8';
  gameBoard.innerHTML = '';
  previewCountdownEl.classList.add('hidden');
}

function startPreview() {
  isPreviewing = true;
  previewCountdownEl.classList.remove('hidden');

  const totalCards = cards.length;
  const hiddenCount = HIDDEN_COUNT_MIN + Math.floor(Math.random() * (HIDDEN_COUNT_MAX - HIDDEN_COUNT_MIN + 1));
  const wrongCount = WRONG_COUNT_MIN + Math.floor(Math.random() * (WRONG_COUNT_MAX - WRONG_COUNT_MIN + 1));

  const indices = Array.from({ length: totalCards }, (_, i) => i);
  shuffleArray(indices);

  const hiddenIndices = new Set(indices.slice(0, hiddenCount));
  const wrongIndices = new Set(indices.slice(hiddenCount, hiddenCount + wrongCount));

  const emojiKeys = Object.keys(CARD_EMOJIS).map(Number);

  cards.forEach((card, index) => {
    card.classList.add('flipped', 'previewing');

    if (hiddenIndices.has(index)) {
      card.classList.add('preview-hidden');
    }

    if (wrongIndices.has(index)) {
      card.classList.add('preview-wrong');
      const cardFront = card.querySelector('.card-front');
      const realId = parseInt(card.dataset.id);
      let wrongId;
      do {
        wrongId = emojiKeys[Math.floor(Math.random() * emojiKeys.length)];
      } while (wrongId === realId);
      cardFront.textContent = CARD_EMOJIS[wrongId] || '\u2753';
      previewWrongCards.add(index);
    }
  });

  let remaining = PREVIEW_DURATION;
  previewCountdownNumberEl.textContent = remaining;

  previewTimer = setInterval(() => {
    remaining--;
    if (remaining > 0) {
      previewCountdownNumberEl.textContent = remaining;
    } else {
      clearInterval(previewTimer);
      previewTimer = null;
      endPreview();
    }
  }, 1000);
}

function endPreview() {
  isPreviewing = false;
  previewCountdownEl.classList.add('hidden');

  cards.forEach((card, index) => {
    card.classList.remove('flipped', 'previewing', 'preview-hidden', 'preview-wrong');

    if (previewWrongCards.has(index)) {
      const cardFront = card.querySelector('.card-front');
      const realId = parseInt(card.dataset.id);
      cardFront.textContent = CARD_EMOJIS[realId] || '\u2753';
    }
  });

  previewWrongCards.clear();
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

async function fetchShuffledCards() {
  try {
    const response = await fetch(`${API_BASE_URL}/shuffle`);
    const data = await response.json();
    return data.cards;
  } catch (error) {
    console.error('Failed to fetch shuffled cards:', error);
    const fallbackCards = [];
    for (let i = 1; i <= 8; i++) {
      fallbackCards.push(i, i);
    }
    shuffleArray(fallbackCards);
    return fallbackCards;
  }
}

function renderCards(cardIds) {
  cardIds.forEach((cardId, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = cardId;
    card.dataset.index = index;

    const cardBack = document.createElement('div');
    cardBack.className = 'card-face card-back';

    const cardFront = document.createElement('div');
    cardFront.className = 'card-face card-front';
    cardFront.textContent = CARD_EMOJIS[cardId] || '\u2753';

    card.appendChild(cardBack);
    card.appendChild(cardFront);

    card.addEventListener('click', () => handleCardClick(card));

    gameBoard.appendChild(card);
    cards.push(card);
  });
}

function handleCardClick(card) {
  if (isPreviewing) return;
  if (isProcessing) return;
  if (card.classList.contains('flipped')) return;
  if (card.classList.contains('matched')) return;
  if (flippedCards.length >= 2) return;

  if (!gameStarted) {
    startTimer();
    gameStarted = true;
  }

  flipCard(card);
  flippedCards.push(card);

  if (flippedCards.length === 2) {
    moves++;
    movesEl.textContent = moves;
    checkMatch();
  }
}

function flipCard(card) {
  card.classList.add('flipped');
}

function unflipCard(card) {
  card.classList.remove('flipped');
}

function checkMatch() {
  isProcessing = true;

  const [card1, card2] = flippedCards;
  const id1 = parseInt(card1.dataset.id);
  const id2 = parseInt(card2.dataset.id);

  if (id1 === id2) {
    setTimeout(() => {
      card1.classList.add('matched');
      card2.classList.add('matched');
      matchedPairs++;
      matchedEl.textContent = `${matchedPairs}/8`;
      flippedCards = [];
      isProcessing = false;

      if (matchedPairs === 8) {
        endGame();
      }
    }, 500);
  } else {
    setTimeout(() => {
      unflipCard(card1);
      unflipCard(card2);
      flippedCards = [];
      isProcessing = false;
    }, 1000);
  }
}

function startTimer() {
  startTime = Date.now() - elapsedTime;
  timer = setInterval(() => {
    elapsedTime = Date.now() - startTime;
    updateTimerDisplay();
  }, 100);
}

function updateTimerDisplay() {
  const totalSeconds = Math.floor(elapsedTime / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function endGame() {
  clearInterval(timer);
  timer = null;

  finalTimeEl.textContent = timerEl.textContent;
  finalMovesEl.textContent = moves;

  setTimeout(() => {
    winModal.classList.remove('hidden');
  }, 500);
}

async function submitScore() {
  const playerName = playerNameInput.value.trim() || 'Anonymous';
  const timeInSeconds = Math.floor(elapsedTime / 1000);

  try {
    const response = await fetch(`${API_BASE_URL}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        time: timeInSeconds,
        playerName: playerName
      })
    });

    const data = await response.json();

    if (data.success) {
      alert(`Congratulations! You ranked #${data.rank}!`);
      winModal.classList.add('hidden');
      showLeaderboard();
    }
  } catch (error) {
    console.error('Failed to submit score:', error);
    alert('Failed to submit score, please try again later');
  }
}

async function showLeaderboard() {
  try {
    const response = await fetch(`${API_BASE_URL}/leaderboard`);
    const data = await response.json();
    renderLeaderboard(data.leaderboard);
  } catch (error) {
    console.error('Failed to load leaderboard:', error);
    leaderboardList.innerHTML = '<li>Failed to load leaderboard</li>';
  }

  leaderboardModal.classList.remove('hidden');
}

function renderLeaderboard(leaderboard) {
  if (!leaderboard || leaderboard.length === 0) {
    leaderboardList.innerHTML = '<li class="empty-message">No records yet, come and challenge!</li>';
    return;
  }

  leaderboardList.innerHTML = '';

  leaderboard.forEach((entry, index) => {
    const li = document.createElement('li');
    li.className = 'rank-item';

    const minutes = Math.floor(entry.time / 60);
    const seconds = entry.time % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    li.innerHTML = `
      <span class="rank-name">
        <span class="rank">#${index + 1}</span>
        <span class="name">${entry.playerName}</span>
      </span>
      <span class="time">${timeStr}</span>
    `;

    leaderboardList.appendChild(li);
  });
}

restartBtn.addEventListener('click', initGame);
playAgainBtn.addEventListener('click', () => {
  winModal.classList.add('hidden');
  initGame();
});
leaderboardBtn.addEventListener('click', showLeaderboard);
closeLeaderboardBtn.addEventListener('click', () => {
  leaderboardModal.classList.add('hidden');
});
submitScoreBtn.addEventListener('click', submitScore);

initGame();

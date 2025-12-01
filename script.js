// Blackjack script with chips/bet display + animated dealing + hand totals

const suits = ['♠','♥','♦','♣'];
const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

let deck, dealerHand, playerHands, activeHandIndex;
let count = 0;
let chips = 1000;
let currentBet = 0;
let gameOver = false;

const chipCountSpan = document.getElementById('chip-count');
const betDisplaySpan = document.getElementById('bet-display');
const countValueSpan = document.getElementById('count-value');
const betInput = document.getElementById('bet-input');
const placeBetBtn = document.getElementById('place-bet');

const dealBtn = document.getElementById('deal');
const hitBtn = document.getElementById('hit');
const standBtn = document.getElementById('stand');
const doubleBtn = document.getElementById('double');
const splitBtn = document.getElementById('split');
const messageDiv = document.getElementById('message');

placeBetBtn.addEventListener('click', placeBet);
dealBtn.addEventListener('click', () => dealWithAnimation());
hitBtn.addEventListener('click', () => hitWithAnimation());
standBtn.addEventListener('click', stand);
doubleBtn.addEventListener('click', () => doubleDownWithAnimation());
splitBtn.addEventListener('click', () => splitWithAnimation());

function updateChipsAndCount() {
  chipCountSpan.textContent = chips;
  betDisplaySpan.textContent = currentBet;
  countValueSpan.textContent = count;
}

function placeBet() {
  const v = parseInt(betInput.value);
  if (isNaN(v) || v < 1) {
    alert("Please enter a valid bet amount.");
    return;
  }
  if (v > chips) {
    alert("Not enough chips.");
    return;
  }
  currentBet = v;
  chips -= v;
  updateChipsAndCount();
  dealBtn.disabled = false;
  hitBtn.disabled = true;
  standBtn.disabled = true;
  doubleBtn.disabled = true;
  splitBtn.disabled = true;
  messageDiv.textContent = `Bet placed: ${currentBet}`;
}

// Utilities
function buildDeck() {
  const d = [];
  for (let s of suits) for (let v of values) d.push({ suit: s, value: v });
  return shuffle(d);
}
function shuffle(a) {
  return a.sort(() => Math.random() - 0.5);
}
function getCardValue(card) {
  if (['J','Q','K'].includes(card.value)) return 10;
  if (card.value === 'A') return 11;
  return parseInt(card.value);
}
function getCountValue(card) {
  if (['2','3','4','5','6'].includes(card.value)) return 1;
  if (['10','J','Q','K','A'].includes(card.value)) return -1;
  return 0;
}

// Core deal logic but with animation
async function dealWithAnimation() {
  if (currentBet <= 0) {
    alert("You must place a bet first.");
    return;
  }
  deck = buildDeck();
  dealerHand = [];
  playerHands = [[]];
  activeHandIndex = 0;
  count = 0;
  gameOver = false;
  messageDiv.textContent = '';
  clearHandsUI();

  // Deal cards in sequence: player, dealer, player, dealer
  await dealCardTo(playerHands[0], 'player-hands');
  await dealCardTo(dealerHand, 'dealer-hand', true);
  await dealCardTo(playerHands[0], 'player-hands');
  await dealCardTo(dealerHand, 'dealer-hand', true);

  enableButtons();
  dealBtn.disabled = true;

  // After deal, handle blackjack check
  const pTotal = getHandValue(playerHands[0]);
  const dTotal = getHandValue(dealerHand);
  if (pTotal === 21) {
    if (dTotal === 21) {
      finish("Push — both Blackjack.");
      chips += currentBet;
    } else {
      finish("BLACKJACK! You win!");
      fireworks && fireworks();
      chips += Math.floor(currentBet * 2.5);
    }
    updateChipsAndCount();
    return;
  }
}

async function hitWithAnimation() {
  if (gameOver) return;
  const hand = playerHands[activeHandIndex];
  await dealCardTo(hand, 'player-hands');
  if (getHandValue(hand) > 21) {
    nextHandOrDealer();
  }
}

async function doubleDownWithAnimation() {
  if (gameOver) return;
  if (chips < currentBet) {
    alert("Not enough chips to double.");
    return;
  }
  chips -= currentBet;
  currentBet *= 2;
  updateChipsAndCount();
  const hand = playerHands[activeHandIndex];
  await dealCardTo(hand, 'player-hands');
  nextHandOrDealer();
}

async function splitWithAnimation() {
  if (gameOver) return;
  const hand = playerHands[activeHandIndex];
  if (hand.length !== 2) return;
  if (getCardValue(hand[0]) !== getCardValue(hand[1])) return;
  if (chips < currentBet) {
    alert("Not enough chips to split.");
    return;
  }
  chips -= currentBet;
  updateChipsAndCount();

  const card1 = hand[0], card2 = hand[1];
  playerHands = [
    [card1],
    [card2]
  ];
  activeHandIndex = 0;
  clearHandsUI();
  await dealCardTo(playerHands[0], 'player-hands');
  await dealCardTo(playerHands[1], 'player-hands');
}

function clearHandsUI() {
  document.getElementById('dealer-hand').innerHTML = '';
  document.getElementById('player-hands').innerHTML = '';
}

function dealCardTo(hand, parentDivId, hideFirst = false) {
  return new Promise(resolve => {
    const card = deck.pop();
    count += getCountValue(card);
    hand.push(card);
    updateChipsAndCount();

    const parent = document.getElementById(parentDivId);
    const handContainer = (parentDivId === 'player-hands')
      ? parent  // we will manage grouping in updateUI
      : parent;

    // Render card visually
    const cardDiv = renderCard(card, hideFirst && hand === dealerHand);
    parent.appendChild(cardDiv);
    // Trigger animation
    setTimeout(() => {
      cardDiv.classList.add('show');
    }, 50);
    // Wait animation then update UI totals + resolve
    setTimeout(() => {
      updateUI();
      resolve();
    }, 300); // duration matches CSS transition
  });
}

function hit() { /* handled by hitWithAnimation */ }
function deal() { /* handled by dealWithAnimation */ }

function stand() {
  if (gameOver) return;
  nextHandOrDealer();
}

function nextHandOrDealer() {
  activeHandIndex++;
  if (activeHandIndex >= playerHands.length) dealerTurn();
  else updateUI();
}

function dealerTurn() {
  disableButtons();
  (async () => {
    while (getHandValue(dealerHand) < 17) {
      await dealCardTo(dealerHand, 'dealer-hand', false);
    }
    updateUI(true);
    settle();
  })();
}

function settle() {
  const dt = getHandValue(dealerHand);
  let msg = "";
  playerHands.forEach((hand, i) => {
    const pt = getHandValue(hand);
    if (pt > 21) msg += `Hand ${i+1}: Bust. `;
    else if (dt > 21 || pt > dt) {
      msg += `Hand ${i+1}: You win! `;
      chips += currentBet * 2;
    }
    else if (pt < dt) msg += `Hand ${i+1}: Dealer wins. `;
    else {
      msg += `Hand ${i+1}: Push. `;
      chips += currentBet;
    }
  });

  messageDiv.textContent = msg;
  updateChipsAndCount();

  currentBet = 0;
  dealBtn.disabled = true;
}

function getHandValue(hand) {
  let total = 0, aces = 0;
  for (let c of hand) {
    total += getCardValue(c);
    if (c.value === 'A') aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function renderCard(card, hide=false) {
  const d = document.createElement("div");
  d.className = "card";
  d.textContent = hide ? "🂠" : (card.value + card.suit);
  return d;
}

function enableButtons() {
  hitBtn.disabled = false;
  standBtn.disabled = false;
  doubleBtn.disabled = false;
  splitBtn.disabled = false;
}

function disableButtons() {
  hitBtn.disabled = true;
  standBtn.disabled = true;
  doubleBtn.disabled = true;
  splitBtn.disabled = true;
}

// If you have fireworks from earlier version, keep it
function fireworks() {
  for (let i = 0; i < 40; i++) {
    const f = document.createElement('div');
    f.className = 'firework';
    const size = Math.random() * 6 + 4;
    f.style.width = f.style.height = size + 'px';
    f.style.background = `hsl(${Math.random() * 360}, 100%, 60%)`;
    f.style.left = (window.innerWidth / 2 + (Math.random() - 0.5) * 200) + 'px';
    f.style.top = (window.innerHeight / 2 + (Math.random() - 0.5) * 200) + 'px';
    fireworksContainer && fireworksContainer.appendChild(f);
    setTimeout(() => f.remove(), 1200);
  }
}

// Init
updateChipsAndCount();

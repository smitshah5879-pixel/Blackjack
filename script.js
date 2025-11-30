// Blackjack script with fixed betting rules

const suits = ['♠', '♥', '♦', '♣'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

let deck, dealerHand, playerHands, activeHandIndex;
let count = 0;
let chips = 1000;
let currentBet = 0;
let gameOver = false;

const chipCountSpan = document.getElementById('chip-count');
const betInput = document.getElementById('bet-input');
const placeBetBtn = document.getElementById('place-bet');

const dealBtn = document.getElementById('deal');
const hitBtn = document.getElementById('hit');
const standBtn = document.getElementById('stand');
const doubleBtn = document.getElementById('double');
const splitBtn = document.getElementById('split');
const messageDiv = document.getElementById('message');

const showStrategyBtn = document.getElementById('show-strategy');
const strategyModal = document.getElementById('strategy-modal');
const closeModal = document.getElementById('close-modal');

const fireworksContainer = document.getElementById('fireworks-container');

placeBetBtn.addEventListener('click', placeBet);
dealBtn.addEventListener('click', deal);
hitBtn.addEventListener('click', hit);
standBtn.addEventListener('click', stand);
doubleBtn.addEventListener('click', doubleDown);
splitBtn.addEventListener('click', splitHand);

// Modal logic
showStrategyBtn.addEventListener('click', () => strategyModal.classList.remove('hidden'));
closeModal.addEventListener('click', () => strategyModal.classList.add('hidden'));
strategyModal.addEventListener('click', e => { if (e.target === strategyModal) strategyModal.classList.add('hidden') });



function updateChips() {
  chipCountSpan.textContent = chips;
  document.getElementById('count-value').textContent = count;
}



// 🔥 FIX: Player must place a bet before Deal is unlocked
function placeBet() {
  const v = parseInt(betInput.value);

  if (isNaN(v) || v < 1) {
    alert("Please enter a valid bet amount.");
    return;
  }

  if (v > chips) {
    alert("You do not have enough chips for that bet.");
    return;
  }

  // Deduct bet from chips now
  currentBet = v;
  chips -= v;

  updateChips();

  dealBtn.disabled = false;   // Only now Deal is unlocked
  hitBtn.disabled = true;
  standBtn.disabled = true;
  doubleBtn.disabled = true;
  splitBtn.disabled = true;

  messageDiv.textContent = `Bet placed: ${currentBet}`;
}



// MAIN DEAL
function deal() {
  if (currentBet <= 0) {
    alert("You must bet before dealing.");
    return;
  }

  deck = buildDeck();
  dealerHand = [];
  playerHands = [[]];
  activeHandIndex = 0;
  count = 0;
  gameOver = false;
  messageDiv.textContent = '';

  // Deal initial cards
  playerHands[0].push(drawCard());
  playerHands[0].push(drawCard());
  dealerHand.push(drawCard());
  dealerHand.push(drawCard());

  updateUI();
  enableButtons();

  dealBtn.disabled = true; // LOCK deal until a NEW bet is placed

  // Check player blackjack
  const playerTotal = getHandValue(playerHands[0]);
  const dealerTotal = getHandValue(dealerHand);

  if (playerTotal === 21) {
    if (dealerTotal === 21) {
      finish("Push! Both have Blackjack");
      chips += currentBet; // refund
      updateChips();
      return;
    }

    finish("BLACKJACK! You win!");
    fireworks();
    chips += Math.floor(currentBet * 2.5);  // 3:2 payout
    updateChips();
    return;
  }
}



// HIT
function hit() {
  const hand = playerHands[activeHandIndex];
  hand.push(drawCard());
  updateUI();

  if (getHandValue(hand) > 21) {
    nextHandOrDealer();
  }
}



// STAND
function stand() {
  nextHandOrDealer();
}



// DOUBLE DOWN
function doubleDown() {
  if (chips < currentBet) {
    alert("Not enough chips to double.");
    return;
  }

  chips -= currentBet;
  currentBet *= 2;

  const hand = playerHands[activeHandIndex];
  hand.push(drawCard());

  updateChips();
  updateUI();

  nextHandOrDealer();
}



// SPLIT
function splitHand() {
  const hand = playerHands[activeHandIndex];

  if (hand.length !== 2) return;
  if (getCardValue(hand[0]) !== getCardValue(hand[1])) return;

  if (chips < currentBet) {
    alert("Not enough chips to split.");
    return;
  }

  chips -= currentBet;
  updateChips();

  playerHands = [
    [hand[0], drawCard()],
    [hand[1], drawCard()]
  ];
  activeHandIndex = 0;
  updateUI();
}



function nextHandOrDealer() {
  activeHandIndex++;

  if (activeHandIndex >= playerHands.length) {
    dealerTurn();
  } else {
    updateUI();
  }
}



// DEALER LOGIC
function dealerTurn() {
  disableButtons();
  while (getHandValue(dealerHand) < 17) {
    dealerHand.push(drawCard());
  }
  updateUI(true);
  settle();
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
  updateChips();

  // Auto-refill chips when hit 0
  if (chips <= 0) {
    chips += 1000;
    alert("You ran out of chips! 1000 chips added.");
    updateChips();
  }

  // ⚠️ Require new bet
  currentBet = 0;
  dealBtn.disabled = true;
}



// Utility functions
function buildDeck() {
  const d = [];
  for (let s of suits) for (let v of values) d.push({ suit: s, value: v });
  return d.sort(() => Math.random() - 0.5);
}

function getCardValue(c) {
  if (['J','Q','K'].includes(c.value)) return 10;
  if (c.value === 'A') return 11;
  return parseInt(c.value);
}

function drawCard() {
  const c = deck.pop();
  count += getCountValue(c);
  return c;
}

function getCountValue(c) {
  if (['2','3','4','5','6'].includes(c.value)) return 1;
  if (['10','J','Q','K','A'].includes(c.value)) return -1;
  return 0;
}

function getHandValue(hand) {
  let t = 0, aces = 0;
  hand.forEach(card => {
    t += getCardValue(card);
    if (card.value === 'A') aces++;
  });
  while (t > 21 && aces > 0) {
    t -= 10;
    aces--;
  }
  return t;
}


// UI Rendering -------------------------------------------------

function updateUI(showDealer = false) {
  document.getElementById("count-value").textContent = count;

  // Dealer
  const dealerDiv = document.getElementById("dealer-hand");
  dealerDiv.innerHTML = "";
  dealerHand.forEach((card, i) => {
    const hide = (i === 0 && !showDealer && !gameOver);
    dealerDiv.appendChild(render(card, hide));
  });

  // Player
  const phDiv = document.getElementById("player-hands");
  phDiv.innerHTML = "";
  playerHands.forEach((hand, i) => {
    const div = document.createElement("div");
    div.className = "hand";
    if (i === activeHandIndex && !gameOver) div.style.border = "2px solid yellow";

    hand.forEach(c => div.appendChild(render(c)));
    phDiv.appendChild(div);
  });
}

function render(card, hide=false) {
  const div = document.createElement("div");
  div.className = "card";
  div.textContent = hide ? "🂠" : card.value + card.suit;
  return div;
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



// Fireworks animation
function fireworks() {
  for (let i = 0; i < 40; i++) {
    const f = document.createElement('div');
    f.className = 'firework';
    const size = Math.random() * 6 + 4;
    f.style.width = f.style.height = size + 'px';
    f.style.background = `hsl(${Math.random() * 360}, 100%, 60%)`;
    f.style.left = (window.innerWidth / 2 + (Math.random() - 0.5) * 200) + 'px';
    f.style.top = (window.innerHeight / 2 + (Math.random() - 0.5) * 200) + 'px';
    fireworksContainer.appendChild(f);
    setTimeout(() => f.remove(), 1200);
  }
}

// Init
function updateChips() {
  chipCountSpan.textContent = chips;
  document.getElementById('count-value').textContent = count;
}




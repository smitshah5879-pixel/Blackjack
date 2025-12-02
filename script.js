// Blackjack script — betting, card count, hand totals, strategy popup, auto‑reset when chips 0

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

const showStrategyBtn = document.getElementById('show-strategy');
const strategyModal = document.getElementById('strategy-modal');
const closeModal = document.getElementById('close-modal');

placeBetBtn.addEventListener('click', placeBet);
dealBtn.addEventListener('click', deal);
hitBtn.addEventListener('click', hit);
standBtn.addEventListener('click', stand);
doubleBtn.addEventListener('click', doubleDown);
splitBtn.addEventListener('click', splitHand);

// Strategy popup
showStrategyBtn.addEventListener('click', () => strategyModal.classList.remove('hidden'));
closeModal.addEventListener('click', () => strategyModal.classList.add('hidden'));
strategyModal.addEventListener('click', e => { if (e.target === strategyModal) strategyModal.classList.add('hidden'); });


function updateChipsAndCount() {
  chipCountSpan.textContent = chips;
  betDisplaySpan.textContent = currentBet;
  countValueSpan.textContent = count;
}

function placeBet() {
  const v = parseInt(betInput.value);
  if (isNaN(v) || v < 1) {
    alert("Please enter a valid bet.");
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
function drawCard() {
  const c = deck.pop();
  count += getCountValue(c);
  return c;
}

function deal() {
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

  playerHands[0].push(drawCard());
  playerHands[0].push(drawCard());
  dealerHand.push(drawCard());
  dealerHand.push(drawCard());

  updateUI();
  enableButtons();
  dealBtn.disabled = true;

  const pTotal = getHandValue(playerHands[0]);
  const dTotal = getHandValue(dealerHand);
  if (pTotal === 21) {
    if (dTotal === 21) {
      finish("Push — both Blackjack.");
      chips += currentBet;
    } else {
      finish("BLACKJACK! You win!");
      chips += Math.floor(currentBet * 2.5);
    }
    updateChipsAndCount();
  }
}

function hit() {
  if (gameOver) return;
  const hand = playerHands[activeHandIndex];
  hand.push(drawCard());
  updateUI();
  if (getHandValue(hand) > 21) {
    nextHandOrDealer();
  }
}

function stand() {
  if (gameOver) return;
  nextHandOrDealer();
}

function doubleDown() {
  if (gameOver) return;
  const hand = playerHands[activeHandIndex];
  if (hand.length !== 2) return;
  if (chips < currentBet) {
    alert("Not enough chips to double.");
    return;
  }
  chips -= currentBet;
  currentBet *= 2;
  hand.push(drawCard());
  updateChipsAndCount();
  updateUI();
  nextHandOrDealer();
}

function splitHand() {
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
  updateChipsAndCount();

  if (chips <= 0) {
    alert("You ran out of chips! 1000 chips have been added so you can play again.");
    chips = 1000;
    updateChipsAndCount();
  }

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

function updateUI(showDealer = false) {
  countValueSpan.textContent = count;

  const dealerDiv = document.getElementById('dealer-hand');
  dealerDiv.innerHTML = '';
  dealerHand.forEach((c, i) => {
    const hide = (i === 0 && !showDealer && !gameOver);
    dealerDiv.appendChild(renderCard(c, hide));
  });
  const dealerTotalDiv = document.getElementById('dealer-total');
  if (showDealer || gameOver) dealerTotalDiv.textContent = "Total: " + getHandValue(dealerHand);
  else dealerTotalDiv.textContent = "Total: ?";

  const phDiv = document.getElementById('player-hands');
  phDiv.innerHTML = "";
  playerHands.forEach((hand, idx) => {
    const handDiv = document.createElement("div");
    handDiv.className = "hand-container";

    const cardsDiv = document.createElement("div");
    cardsDiv.className = "hand";
    hand.forEach(c => cardsDiv.appendChild(renderCard(c)));
    handDiv.appendChild(cardsDiv);

    const totalDiv = document.createElement("div");
    totalDiv.className = "hand-total";
    totalDiv.textContent = "Total: " + getHandValue(hand);
    handDiv.appendChild(totalDiv);

    phDiv.appendChild(handDiv);
  });

  updateChipsAndCount();
}

function renderCard(card, hide=false) {
  const d = document.createElement("div");
  d.className = "card";
  d.textContent = hide ? "🂠" : card.value + card.suit;
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

function finish(msg) {
  gameOver = true;
  disableButtons();
  messageDiv.textContent = msg;
}

// initialize
updateChipsAndCount();

// =========================================================
// MÓDULO DE BLACKJACK (DIABO COMO DEALER)
// =========================================================
const BlackjackGame = {
    deck: [],
    dealerHand: [],
    playerHand: [],
    currentBet: 5,
    minBet: 5,
    isHandActive: false,
    dealerHidden: true,

    init() {
        // Garante pelo menos 5 de HP caso o jogador tenha chegado na mesa com menos
        if (window.currentRunState.playerStats.health < this.minBet) {
            window.currentRunState.playerStats.health = this.minBet;
        }

        this.currentBet = this.minBet;
        this.isHandActive = false;
        this.dealerHand = [];
        this.playerHand = [];

        document.getElementById('bj-dealer-cards').innerHTML = '';
        document.getElementById('bj-player-cards').innerHTML = '';
        document.getElementById('bj-dealer-score').textContent = '?';
        document.getElementById('bj-player-score').textContent = '0';
        document.getElementById('bj-message').textContent = 'PLACE YOUR HEALTH BET (SURPASS 100 HP TO WIN)';

        document.getElementById('bj-bet-controls').classList.remove('hidden');
        document.getElementById('bj-play-controls').classList.add('hidden');

        this.updateStatsUI();
    },

    createDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.deck = [];

        for (const suit of suits) {
            for (const value of values) {
                this.deck.push({ suit, value });
            }
        }

        // Embaralha as 52 cartas
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    },

    drawCard() {
        if (this.deck.length === 0) this.createDeck();
        return this.deck.pop();
    },

    calculateScore(hand) {
        let score = 0;
        let aces = 0;

        for (const card of hand) {
            if (card.value === 'A') {
                aces += 1;
                score += 11;
            } else if (['J', 'Q', 'K'].includes(card.value)) {
                score += 10;
            } else {
                score += parseInt(card.value, 10);
            }
        }

        // Ás vale 11 ou 1 automaticamente para não estourar
        while (score > 21 && aces > 0) {
            score -= 10;
            aces -= 1;
        }

        return score;
    },

    changeBet(amount) {
        if (this.isHandActive) return;
        const currentHp = window.currentRunState.playerStats.health;
        this.currentBet = Phaser.Math.Clamp(this.currentBet + amount, this.minBet, currentHp);
        this.updateStatsUI();
    },

    updateStatsUI() {
        const stats = window.currentRunState.playerStats;
        document.getElementById('bj-hp-text').textContent = `${stats.health}/${stats.maxHealth}`;
        document.getElementById('bj-bet-text').textContent = `${this.currentBet}`;
    },

    renderCards() {
        const dealerRow = document.getElementById('bj-dealer-cards');
        const playerRow = document.getElementById('bj-player-cards');
        dealerRow.innerHTML = '';
        playerRow.innerHTML = '';

        this.dealerHand.forEach((card, index) => {
            if (index === 1 && this.dealerHidden) {
                const hiddenEl = document.createElement('div');
                hiddenEl.className = 'bj-card hidden-card';
                hiddenEl.textContent = '?';
                dealerRow.appendChild(hiddenEl);
            } else {
                dealerRow.appendChild(this.createCardElement(card));
            }
        });

        this.playerHand.forEach(card => {
            playerRow.appendChild(this.createCardElement(card));
        });

        const playerScore = this.calculateScore(this.playerHand);
        document.getElementById('bj-player-score').textContent = playerScore;

        if (this.dealerHidden && this.dealerHand.length > 0) {
            const firstCardScore = this.calculateScore([this.dealerHand[0]]);
            document.getElementById('bj-dealer-score').textContent = `${firstCardScore} + ?`;
        } else {
            document.getElementById('bj-dealer-score').textContent = this.calculateScore(this.dealerHand);
        }
    },

    createCardElement(card) {
        const el = document.createElement('div');
        const isRed = card.suit === '♥' || card.suit === '♦';
        el.className = `bj-card ${isRed ? 'red' : ''}`;
        el.innerHTML = `
            <div>${card.value}${card.suit}</div>
            <div class="bj-card-center">${card.suit}</div>
            <div style="align-self: flex-end;">${card.value}${card.suit}</div>
        `;
        return el;
    },

    startDeal() {
        if (this.isHandActive) return;
        const stats = window.currentRunState.playerStats;

        if (stats.health < this.minBet) {
            window.triggerGameOver();
            return;
        }

        if (this.currentBet > stats.health) {
            this.currentBet = stats.health;
        }

        this.isHandActive = true;
        this.dealerHidden = true;

        this.createDeck();
        this.playerHand = [this.drawCard(), this.drawCard()];
        this.dealerHand = [this.drawCard(), this.drawCard()];

        this.updateStatsUI();
        this.renderCards();

        document.getElementById('bj-bet-controls').classList.add('hidden');
        document.getElementById('bj-play-controls').classList.remove('hidden');

        // Só mostra o botão DOUBLE se o jogador tiver vida suficiente para dobrar a aposta
        const doubleBtn = document.getElementById('btn-bj-double');
        if (stats.health >= this.currentBet * 2) {
            doubleBtn.classList.remove('hidden');
        } else {
            doubleBtn.classList.add('hidden');
        }

        document.getElementById('bj-message').textContent = 'HIT, STAND OR DOUBLE?';
        if (window.resetMenuSelection) window.resetMenuSelection();

        // Checa Blackjack Natural imediato (21 com 2 cartas)
        const playerScore = this.calculateScore(this.playerHand);
        const dealerScore = this.calculateScore(this.dealerHand);

        if (playerScore === 21 || dealerScore === 21) {
            this.dealerHidden = false;
            this.renderCards();
            if (playerScore === 21 && dealerScore === 21) {
                this.endHand('push', 'BOTH HAVE BLACKJACK! PUSH.');
            } else if (playerScore === 21) {
                this.endHand('blackjack', 'NATURAL BLACKJACK!');
            } else {
                this.endHand('lose', 'THE DEVIL HAS BLACKJACK!');
            }
        }
    },

    hit() {
        if (!this.isHandActive) return;

        this.playerHand.push(this.drawCard());
        document.getElementById('btn-bj-double').classList.add('hidden');
        if (window.resetMenuSelection) window.resetMenuSelection();

        this.renderCards();

        const playerScore = this.calculateScore(this.playerHand);
        if (playerScore > 21) {
            this.dealerHidden = false;
            this.renderCards();
            this.endHand('bust', 'BUST! YOU WENT OVER 21.');
        } else if (playerScore === 21) {
            this.stand();
        }
    },

    doubleDown() {
        if (!this.isHandActive) return;
        const stats = window.currentRunState.playerStats;
        if (stats.health < this.currentBet * 2) return;

        this.currentBet *= 2;
        this.updateStatsUI();

        this.playerHand.push(this.drawCard());
        this.renderCards();

        const playerScore = this.calculateScore(this.playerHand);
        if (playerScore > 21) {
            this.dealerHidden = false;
            this.renderCards();
            this.endHand('bust', 'BUST ON DOUBLE DOWN!');
        } else {
            this.stand();
        }
    },

    stand() {
        if (!this.isHandActive) return;

        this.dealerHidden = false;

        // Regra oficial: Dealer compra até ter 17 ou mais
        while (this.calculateScore(this.dealerHand) < 17) {
            this.dealerHand.push(this.drawCard());
        }

        this.renderCards();

        const playerScore = this.calculateScore(this.playerHand);
        const dealerScore = this.calculateScore(this.dealerHand);

        if (dealerScore > 21) {
            this.endHand('win', 'THE DEVIL BUSTED! YOU WIN!');
        } else if (playerScore > dealerScore) {
            this.endHand('win', `YOU WIN! (${playerScore} vs ${dealerScore})`);
        } else if (playerScore < dealerScore) {
            this.endHand('lose', `THE DEVIL WINS! (${dealerScore} vs ${playerScore})`);
        } else {
            this.endHand('push', `PUSH! TIE AT ${playerScore}.`);
        }
    },

    endHand(outcome, customMsg) {
        this.isHandActive = false;
        const stats = window.currentRunState.playerStats;
        let msg = customMsg;

        if (outcome === 'blackjack') {
            const profit = Math.ceil(this.currentBet * 1.5);
            stats.health += profit;
            msg = `${customMsg} +${profit} HP!`;
        } else if (outcome === 'win') {
            stats.health += this.currentBet;
            msg = `${customMsg} +${this.currentBet} HP!`;
        } else if (outcome === 'lose' || outcome === 'bust') {
            stats.health = Math.max(0, stats.health - this.currentBet);
            msg = `${customMsg} -${this.currentBet} HP.`;
        }

        this.updateStatsUI();
        document.getElementById('bj-message').textContent = msg;

        // 1. VITÓRIA: Se conquistou vida excedente (health > maxHealth, ou seja, > 100)
        if (stats.health > stats.maxHealth) {
            document.getElementById('bj-play-controls').classList.add('hidden');
            document.getElementById('bj-bet-controls').classList.add('hidden');
            document.getElementById('bj-message').textContent = 'SURPLUS HEALTH ACHIEVED! YOU DEFEATED THE DEVIL!';

            setTimeout(() => {
                if (typeof window.triggerVictoryWhiteGradient === 'function') {
                    window.triggerVictoryWhiteGradient();
                }
            }, 1300);
            return;
        }

        // 2. DERROTA: Se ficou com menos de 5 de vida (aposta mínima) ou zerou
        if (stats.health < this.minBet) {
            document.getElementById('bj-play-controls').classList.add('hidden');
            document.getElementById('bj-bet-controls').classList.add('hidden');

            setTimeout(() => {
                if (typeof window.triggerGameOver === 'function') {
                    window.triggerGameOver();
                }
            }, 1100);
            return;
        }

        // 3. Continua para a próxima mão
        this.currentBet = Math.min(this.currentBet, stats.health);
        if (this.currentBet < this.minBet) this.currentBet = this.minBet;
        this.updateStatsUI();

        document.getElementById('bj-play-controls').classList.add('hidden');
        document.getElementById('bj-bet-controls').classList.remove('hidden');

        if (window.resetMenuSelection) window.resetMenuSelection();
    }
};

// Conecta os botões da mesa de Blackjack
document.getElementById('btn-bj-minus').addEventListener('click', () => BlackjackGame.changeBet(-5));
document.getElementById('btn-bj-plus').addEventListener('click', () => BlackjackGame.changeBet(5));
document.getElementById('btn-bj-deal').addEventListener('click', () => BlackjackGame.startDeal());
document.getElementById('btn-bj-hit').addEventListener('click', () => BlackjackGame.hit());
document.getElementById('btn-bj-stand').addEventListener('click', () => BlackjackGame.stand());
document.getElementById('btn-bj-double').addEventListener('click', () => BlackjackGame.doubleDown());
// Converte qualquer ângulo para uma das 8 direções (-1, 0, 1)
function get8DirectionVector(dx, dy) {
    if (dx === 0 && dy === 0) return { x: 0, y: 1 };
    const angle = Math.atan2(dy, dx);
    const octant = Math.round(angle / (Math.PI / 4));
    const dirX = Math.round(Math.cos(octant * (Math.PI / 4)));
    const dirY = Math.round(Math.sin(octant * (Math.PI / 4)));
    return { x: dirX, y: dirY };
}

// Estado global da partida (usado pelo Save/Load e pelo Blackjack)
window.currentRunState = {
    scene: 'TopDownScene', // 'TopDownScene' ou 'Blackjack'
    kills: 0,
    playerStats: { ...ENTITY_TEMPLATES.cowgirl }
};

class TopDownScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TopDownScene' });
    }

    preload() {
        this.load.image('cowgirl', 'assets/cowgirl.png');
        this.load.image('skeleton', 'assets/skeleton.png');
        this.load.image('whip', 'assets/whip.png');
        this.load.image('sword', 'assets/sword.png');

        this.load.image('cowgirl_front_1', 'assets/cowgirl_front_1.png');
        this.load.image('cowgirl_front_2', 'assets/cowgirl_front_2.png');
        this.load.image('cowgirl_back_1', 'assets/cowgirl_back_1.png');
        this.load.image('cowgirl_back_2', 'assets/cowgirl_back_2.png');

        this.load.image('attack_right', 'assets/attack_right.png');
        this.load.image('attack_left', 'assets/attack_left.png');
        this.load.image('attack_up', 'assets/attack_up.png');
        this.load.image('attack_down', 'assets/attack_down.png');
    }

    create() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        this.createPlayerAnimations();

        this.allies = this.physics.add.group();

        // Cria a Princess Cowgirl usando os status atuais
        this.player = createPlayer(this, centerX, centerY, window.currentRunState.playerStats);
        this.player.isAttacking = false;
        this.allies.add(this.player);

        this.killCount = window.currentRunState.kills || 0;
        this.targetKills = 10;
        this.sceneCompleted = false;

        this.enemies = this.physics.add.group();

        // Spawna o primeiro esqueleto
        this.spawnFromRandomPoint();

        // Spawna um novo esqueleto a cada 10 segundos
        this.spawnTimer = this.time.addEvent({
            delay: 10000,
            callback: this.spawnFromRandomPoint,
            callbackScope: this,
            loop: true
        });

        this.createPlayerHUD();

        this.lastAttackTime = -Infinity;
        this.wasGamepadAttackPressed = false;

        this.keys = this.input.keyboard.addKeys({
            w: Phaser.Input.Keyboard.KeyCodes.W,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            a: Phaser.Input.Keyboard.KeyCodes.A,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            up: Phaser.Input.Keyboard.KeyCodes.UP,
            down: Phaser.Input.Keyboard.KeyCodes.DOWN,
            left: Phaser.Input.Keyboard.KeyCodes.LEFT,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            attack: Phaser.Input.Keyboard.KeyCodes.J
        });
    }

    createPlayerAnimations() {
        if (!this.anims.exists('walk_front') && this.textures.exists('cowgirl_front_1')) {
            this.anims.create({
                key: 'walk_front',
                frames: [{ key: 'cowgirl_front_1' }, { key: 'cowgirl_front_2' }],
                frameRate: 6,
                repeat: -1
            });
        }

        if (!this.anims.exists('walk_back') && this.textures.exists('cowgirl_back_1')) {
            this.anims.create({
                key: 'walk_back',
                frames: [{ key: 'cowgirl_back_1' }, { key: 'cowgirl_back_2' }],
                frameRate: 6,
                repeat: -1
            });
        }
    }

    spawnFromRandomPoint() {
        if (this.sceneCompleted) return;

        const width = this.scale.width;
        const height = this.scale.height;
        const margin = 50;

        const spawnPoints = [
            { name: 'Right',  x: width - margin, y: height / 2 },
            { name: 'Top',    x: width / 2,      y: margin },
            { name: 'Left',   x: margin,         y: height / 2 },
            { name: 'Bottom', x: width / 2,      y: height - margin }
        ];

        const chosenPoint = Phaser.Utils.Array.GetRandom(spawnPoints);
        spawnSkeleton(this, this.enemies, chosenPoint.x, chosenPoint.y);
    }

    onSkeletonKilled() {
        if (this.sceneCompleted) return;

        this.killCount += 1;
        window.currentRunState.kills = this.killCount;
        window.currentRunState.playerStats = { ...this.player.stats };
        this.updatePlayerHUD();

        // Ao atingir 10 abates, congela o combate e abre a tela branca!
        if (this.killCount >= this.targetKills) {
            this.sceneCompleted = true;
            window.triggerTenKillsWhiteScreen();
        } else if (this.enemies.countActive(true) === 0) {
            // Se limpou todos os esqueletos da tela antes dos 10s, já traz o próximo
            this.time.delayedCall(500, () => this.spawnFromRandomPoint());
        }
    }

    createPlayerHUD() {
        const x = 20;
        const hpY = 20;
        const manaY = 54;
        const killsY = 92;
        this.hudBarWidth = 220;
        const barHeight = 24;

        // --- BARRA DE VIDA ---
        this.add.rectangle(x, hpY, this.hudBarWidth + 4, barHeight + 4, 0x000000)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(100);
        this.add.rectangle(x + 2, hpY + 2, this.hudBarWidth, barHeight, 0x2b1115)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(100);
        this.hpBarFill = this.add.rectangle(x + 2, hpY + 2, this.hudBarWidth, barHeight, 0xd9383a)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(101);
        this.hpText = this.add.text(x + 2 + this.hudBarWidth / 2, hpY + 2 + barHeight / 2, '', {
            fontFamily: 'MPLUSRounded1c',
            fontSize: '16px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(102);

        // --- BARRA DE MANA ---
        this.add.rectangle(x, manaY, this.hudBarWidth + 4, barHeight + 4, 0x000000)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(100);
        this.add.rectangle(x + 2, manaY + 2, this.hudBarWidth, barHeight, 0x111c2b)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(100);
        this.manaBarFill = this.add.rectangle(x + 2, manaY + 2, this.hudBarWidth, barHeight, 0x2b7de9)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(101);
        this.manaText = this.add.text(x + 2 + this.hudBarWidth / 2, manaY + 2 + barHeight / 2, '', {
            fontFamily: 'MPLUSRounded1c',
            fontSize: '16px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(102);

        // --- CONTADOR DE ABATES (MPLUSRounded1c) ---
        this.killsText = this.add.text(x + 2, killsY, '', {
            fontFamily: 'MPLUSRounded1c',
            fontSize: '20px',
            color: '#f3bac9',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0, 0).setScrollFactor(0).setDepth(102);

        this.updatePlayerHUD();

        if (document.fonts) {
            document.fonts.ready.then(() => {
                if (this.hpText && this.hpText.active) {
                    this.hpText.setFontFamily('MPLUSRounded1c');
                    this.manaText.setFontFamily('MPLUSRounded1c');
                    this.killsText.setFontFamily('MPLUSRounded1c');
                    this.updatePlayerHUD();
                }
            });
        }
    }

    updatePlayerHUD() {
        const stats = this.player.stats;
        window.currentRunState.playerStats = { ...stats };

        const hpRatio = Phaser.Math.Clamp(stats.health / stats.maxHealth, 0, 1);
        this.hpBarFill.width = this.hudBarWidth * hpRatio;
        this.hpText.setText(`${stats.health}/${stats.maxHealth}`);

        const manaRatio = Phaser.Math.Clamp(stats.mana / stats.maxMana, 0, 1);
        this.manaBarFill.width = this.hudBarWidth * manaRatio;
        this.manaText.setText(`${stats.mana}/${stats.maxMana}`);

        if (this.killsText) {
            this.killsText.setText(`KILLS: ${this.killCount}/${this.targetKills}`);
        }
    }

    getActiveGamepad() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) return gamepads[i];
        }
        return null;
    }

    update(time) {
        if (this.sceneCompleted) {
            this.player.setVelocity(0);
            return;
        }

        this.player.setVelocity(0);

        let inputX = 0;
        let inputY = 0;

        const leftKey = this.keys.a.isDown || this.keys.left.isDown;
        const rightKey = this.keys.d.isDown || this.keys.right.isDown;
        const upKey = this.keys.w.isDown || this.keys.up.isDown;
        const downKey = this.keys.s.isDown || this.keys.down.isDown;

        if (leftKey) inputX = -1;
        else if (rightKey) inputX = 1;

        if (upKey) inputY = -1;
        else if (downKey) inputY = 1;

        const pad = this.getActiveGamepad();
        let gamepadAttackJustPressed = false;

        if (pad) {
            if (pad.buttons[14]?.pressed) inputX = -1;
            else if (pad.buttons[15]?.pressed) inputX = 1;

            if (pad.buttons[12]?.pressed) inputY = -1;
            else if (pad.buttons[13]?.pressed) inputY = 1;

            const stickX = pad.axes[0] || 0;
            const stickY = pad.axes[1] || 0;
            if (Math.hypot(stickX, stickY) > 0.3) {
                const snapped = get8DirectionVector(stickX, stickY);
                inputX = snapped.x;
                inputY = snapped.y;
            }

            const isAttackBtnDown = pad.buttons[2]?.pressed || false;
            if (isAttackBtnDown && !this.wasGamepadAttackPressed) {
                gamepadAttackJustPressed = true;
            }
            this.wasGamepadAttackPressed = isAttackBtnDown;
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.attack) || gamepadAttackJustPressed) {
            this.tryBasicAttack(time);
        }

        if (inputX !== 0 || inputY !== 0) {
            this.player.facingX = inputX;
            this.player.facingY = inputY;

            if (inputY < 0) {
                this.player.lastVerticalLook = 'back';
            } else if (inputY > 0) {
                this.player.lastVerticalLook = 'front';
            }

            if (!this.player.isAttacking) {
                if (inputX < 0) this.player.setFlipX(true);
                else if (inputX > 0) this.player.setFlipX(false);

                const animKey = this.player.lastVerticalLook === 'back' ? 'walk_back' : 'walk_front';
                if (this.anims.exists(animKey)) {
                    this.player.play(animKey, true);
                    this.player.setDisplaySize(SIZES.CHARACTER, SIZES.CHARACTER);
                }
            }

            const length = Math.hypot(inputX, inputY);
            const speedInPixels = this.player.stats.speed * SIZES.SPEED_UNIT;
            this.player.setVelocity(
                (inputX / length) * speedInPixels,
                (inputY / length) * speedInPixels
            );
        } else {
            if (!this.player.isAttacking && this.player.anims.isPlaying) {
                this.player.anims.stop();
                const idleTex = this.player.lastVerticalLook === 'back' ? 'cowgirl_back_1' : 'cowgirl_front_1';
                if (this.textures.exists(idleTex)) {
                    this.player.setTexture(idleTex);
                    this.player.setDisplaySize(SIZES.CHARACTER, SIZES.CHARACTER);
                }
            }
        }

        this.enemies.getChildren().forEach(enemy => {
            if (!enemy.active) return;
            enemy.updateHealthBarPosition();
            this.handleEnemyAI(enemy, time);
        });
    }

    handleEnemyAI(enemy, currentTime) {
        let targetAlly = null;
        let closestDistance = Infinity;

        this.allies.getChildren().forEach(ally => {
            if (!ally.active) return;
            const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, ally.x, ally.y);
            if (dist < closestDistance) {
                closestDistance = dist;
                targetAlly = ally;
            }
        });

        if (!targetAlly) {
            enemy.setVelocity(0);
            return;
        }

        const dx = targetAlly.x - enemy.x;
        const dy = targetAlly.y - enemy.y;
        const distToTarget = Math.hypot(dx, dy);

        const dir8 = get8DirectionVector(dx, dy);
        enemy.facingX = dir8.x;
        enemy.facingY = dir8.y;

        if (enemy.facingX < 0) enemy.setFlipX(true);
        else if (enemy.facingX > 0) enemy.setFlipX(false);

        const rangeInPixels = enemy.stats.range * SIZES.RANGE_UNIT;
        const speedInPixels = enemy.stats.speed * SIZES.SPEED_UNIT;

        if (distToTarget > rangeInPixels * 0.65) {
            const angle = Math.atan2(dy, dx);
            enemy.setVelocity(
                Math.cos(angle) * speedInPixels,
                Math.sin(angle) * speedInPixels
            );
        } else {
            enemy.setVelocity(0);
        }

        const effectiveAttackDistance = rangeInPixels + (SIZES.CHARACTER * 0.45);
        if (
            distToTarget <= effectiveAttackDistance &&
            !enemy.isWindingUp &&
            currentTime - enemy.lastAttackTime >= enemy.stats.attackCooldown
        ) {
            this.startEnemyAttackWithDelay(enemy);
        }
    }

    startEnemyAttackWithDelay(enemy) {
        enemy.isWindingUp = true;
        enemy.setTint(0xffdd88);

        this.time.delayedCall(enemy.stats.attackDelay, () => {
            if (!enemy.active) return;

            enemy.clearTint();
            enemy.isWindingUp = false;
            enemy.lastAttackTime = this.time.now;

            const rangeInPixels = enemy.stats.range * SIZES.RANGE_UNIT;
            const len = Math.hypot(enemy.facingX, enemy.facingY) || 1;
            const normX = enemy.facingX / len;
            const normY = enemy.facingY / len;

            const hitboxX = enemy.x + normX * (rangeInPixels / 2);
            const hitboxY = enemy.y + normY * (rangeInPixels / 2);

            const slashVisual = this.add.rectangle(
                hitboxX,
                hitboxY,
                rangeInPixels,
                SIZES.CHARACTER * 0.75,
                0xff4444,
                0.45
            );
            slashVisual.setRotation(Math.atan2(normY, normX));

            const hitZone = this.add.zone(hitboxX, hitboxY, rangeInPixels, rangeInPixels);
            this.physics.add.existing(hitZone);

            const hitAllies = new Set();

            this.physics.overlap(hitZone, this.allies, (zone, ally) => {
                if (!hitAllies.has(ally)) {
                    hitAllies.add(ally);
                    ally.takeDamage(enemy.stats.dmg);
                }
            });

            this.time.delayedCall(150, () => {
                slashVisual.destroy();
                hitZone.destroy();
            });
        });
    }

    tryBasicAttack(currentTime) {
        const cooldown = this.player.stats.attackCooldown;

        if (currentTime - this.lastAttackTime < cooldown) {
            return;
        }

        this.lastAttackTime = currentTime;

        const rangeInPixels = this.player.stats.range * SIZES.RANGE_UNIT;
        const fx = this.player.facingX;
        const fy = this.player.facingY;
        const len = Math.hypot(fx, fy) || 1;
        const normX = fx / len;
        const normY = fy / len;

        let attackKey = 'attack_down';
        if (fx === 1 && fy === 0) {
            attackKey = 'attack_right';
        } else if (fx === -1 && fy === 0) {
            attackKey = 'attack_left';
        } else if (fy < 0) {
            attackKey = 'attack_up';
        } else if (fy > 0) {
            attackKey = 'attack_down';
        }

        this.player.isAttacking = true;
        this.player.anims.stop();

        if (this.textures.exists(attackKey)) {
            this.player.setFlipX(false);
            this.player.setTexture(attackKey);
            this.player.setDisplaySize(SIZES.CHARACTER, SIZES.CHARACTER);
        }

        const hitboxX = this.player.x + normX * (rangeInPixels / 2);
        const hitboxY = this.player.y + normY * (rangeInPixels / 2);

        const hitZone = this.add.zone(hitboxX, hitboxY, rangeInPixels, rangeInPixels);
        this.physics.add.existing(hitZone);

        const hitEnemies = new Set();

        this.physics.overlap(hitZone, this.enemies, (zone, enemy) => {
            if (!hitEnemies.has(enemy)) {
                hitEnemies.add(enemy);
                enemy.takeDamage(this.player.stats.dmg);
            }
        });

        this.time.delayedCall(200, () => {
            hitZone.destroy();

            if (!this.player.active) return;
            this.player.isAttacking = false;

            if (this.player.facingX < 0) this.player.setFlipX(true);
            else if (this.player.facingX > 0) this.player.setFlipX(false);

            const idleTex = this.player.lastVerticalLook === 'back' ? 'cowgirl_back_1' : 'cowgirl_front_1';
            if (this.textures.exists(idleTex)) {
                this.player.setTexture(idleTex);
                this.player.setDisplaySize(SIZES.CHARACTER, SIZES.CHARACTER);
            }
        });
    }
}

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#121316',
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    }
};

const game = new Phaser.Game(config);
game.scene.add('TopDownScene', TopDownScene, false);

// ====================================================
// GERENCIADOR DE TRILHA SONORA (HOPE vs DEATH)
// ====================================================
const bgMusic = new Audio('assets/countryDEATHside.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.5;
let currentTrackName = 'countryDEATHside.mp3';

function playTrack(trackFileName) {
    if (currentTrackName !== trackFileName) {
        currentTrackName = trackFileName;
        bgMusic.src = `assets/${trackFileName}`;
    }
    if (bgMusic.paused) {
        bgMusic.play().catch(() => {});
    }
}

window.addEventListener('click', () => bgMusic.play().catch(() => {}), { once: true });
window.addEventListener('keydown', () => bgMusic.play().catch(() => {}), { once: true });

// ====================================================
// ELEMENTOS DE INTERFACE E ESTADOS
// ====================================================
const mainMenu = document.getElementById('main-menu');
const mainMenuContent = document.getElementById('main-menu-content');
const pauseMenu = document.getElementById('pause-menu');
const optionsMenu = document.getElementById('options-menu');
const gameoverMenu = document.getElementById('gameover-menu');
const cutsceneScreen = document.getElementById('cutscene-screen');
const cutsceneText = document.getElementById('cutscene-text');
const blackjackScreen = document.getElementById('blackjack-screen');
const gameContainer = document.getElementById('game-container');
const volumeSlider = document.getElementById('volume-slider');
const volumeValue = document.getElementById('volume-value');
const optionsBox = document.querySelector('.options-box');
const toastNotification = document.getElementById('toast-notification');

let isGameRunning = false;
let isGamePaused = false;
let optionsOpenedFrom = 'main';
// activeMenuState pode ser: 'main', 'pause', 'options', 'gameover', 'cutscene', 'blackjack', 'none'
let activeMenuState = 'main';
let selectedIndex = 0;

function showToast(msg) {
    toastNotification.textContent = msg;
    toastNotification.classList.remove('hidden');
    setTimeout(() => {
        toastNotification.classList.add('hidden');
    }, 2000);
}

// ====================================================
// SISTEMA DE SAVE GAME & LOAD GAME (localStorage)
// ====================================================
function saveGameState() {
    const activeTopDown = game.scene.getScene('TopDownScene');
    if (window.currentRunState.scene === 'TopDownScene' && activeTopDown && activeTopDown.player) {
        window.currentRunState.playerStats = { ...activeTopDown.player.stats };
        window.currentRunState.kills = activeTopDown.killCount;
    }

    localStorage.setItem('equimare_save_v1', JSON.stringify(window.currentRunState));
    showToast('GAME SAVED!');
}

function loadGameState() {
    const rawSave = localStorage.getItem('equimare_save_v1');
    if (!rawSave) {
        showToast('NO SAVE FOUND!');
        return;
    }

    const savedData = JSON.parse(rawSave);
    window.currentRunState = {
        scene: savedData.scene || 'TopDownScene',
        kills: savedData.kills || 0,
        playerStats: { ...savedData.playerStats }
    };

    mainMenu.classList.add('hidden');
    pauseMenu.classList.add('hidden');
    optionsMenu.classList.add('hidden');
    gameoverMenu.classList.add('hidden');
    cutsceneScreen.classList.add('hidden');
    gameContainer.classList.remove('game-blurred');
    blackjackScreen.classList.remove('game-blurred');

    isGameRunning = true;
    isGamePaused = false;

    if (window.currentRunState.scene === 'Blackjack') {
        game.scene.stop('TopDownScene');
        startBlackjackScene();
    } else {
        blackjackScreen.classList.add('hidden');
        playTrack('countryHOPEside.mp3');
        setMenuState('none');
        game.scene.stop('TopDownScene');
        game.scene.start('TopDownScene');
    }

    showToast('GAME LOADED!');
}

// ====================================================
// CUTSCENES E TRANSIÇÕES (L, Bolinha/B ou Left Click)
// ====================================================
let cutsceneStep = 0;
// 1 = "You went to hell, but you must come back to the country side"
// 2 = "KILL 'EM"
// 3 = Tela toda vermelha -> Combate
// 10 = Tela toda branca (10 Kills) -> Blackjack
// 20 = Tela Branca Gradiente (Vitória no Blackjack) -> Main Menu

function startIntroCutscene() {
    playTrack('countryHOPEside.mp3');
    mainMenu.classList.add('hidden');
    gameoverMenu.classList.add('hidden');
    pauseMenu.classList.add('hidden');
    blackjackScreen.classList.add('hidden');

    cutsceneStep = 1;
    cutsceneScreen.className = '';
    cutsceneText.textContent = 'You went to hell, but you must come back to the country side';
    cutsceneScreen.classList.remove('hidden');
    setMenuState('cutscene');
}

function advanceCutscene() {
    if (activeMenuState !== 'cutscene') return;

    if (cutsceneStep === 1) {
        cutsceneStep = 2;
        cutsceneText.textContent = "KILL 'EM";
    } else if (cutsceneStep === 2) {
        cutsceneStep = 3;
        cutsceneText.textContent = '';
        cutsceneScreen.classList.add('red-screen');
    } else if (cutsceneStep === 3) {
        cutsceneScreen.className = 'hidden';
        window.currentRunState = {
            scene: 'TopDownScene',
            kills: 0,
            playerStats: { ...ENTITY_TEMPLATES.cowgirl }
        };
        isGameRunning = true;
        isGamePaused = false;
        setMenuState('none');
        game.scene.stop('TopDownScene');
        game.scene.start('TopDownScene');
    } else if (cutsceneStep === 10) {
        cutsceneScreen.className = 'hidden';
        startBlackjackScene();
    } else if (cutsceneStep === 20) {
        cutsceneScreen.className = 'hidden';
        returnToMainMenu();
    }
}

// Clique esquerdo do mouse avança a cutscene/transição
cutsceneScreen.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        advanceCutscene();
    }
});

// Chamado ao abater 10 skeletons
window.triggerTenKillsWhiteScreen = function() {
    game.scene.pause('TopDownScene');
    cutsceneStep = 10;
    cutsceneText.textContent = '';
    cutsceneScreen.className = 'white-screen';
    cutsceneScreen.classList.remove('hidden');
    setMenuState('cutscene');
};

// Chamado ao conquistar vida excedente (> 100 HP) no Blackjack
window.triggerVictoryWhiteGradient = function() {
    blackjackScreen.classList.add('hidden');
    cutsceneStep = 20;
    cutsceneText.textContent = '';
    cutsceneScreen.className = 'white-gradient-transition';
    cutsceneScreen.classList.remove('hidden');
    setMenuState('cutscene');
};

// ====================================================
// TELA DE GAME OVER E TRANSIÇÃO DE CENAS
// ====================================================
window.triggerGameOver = function() {
    isGameRunning = false;
    isGamePaused = false;
    game.scene.stop('TopDownScene');
    pauseMenu.classList.add('hidden');
    optionsMenu.classList.add('hidden');
    blackjackScreen.classList.add('hidden');
    cutsceneScreen.classList.add('hidden');
    gameContainer.classList.remove('game-blurred');
    blackjackScreen.classList.remove('game-blurred');

    gameoverMenu.classList.remove('hidden');
    setMenuState('gameover');
};

function startBlackjackScene() {
    game.scene.stop('TopDownScene');
    window.currentRunState.scene = 'Blackjack';
    playTrack('countryDEATHside.mp3');

    BlackjackGame.init();
    blackjackScreen.classList.remove('hidden');
    isGameRunning = true;
    isGamePaused = false;
    setMenuState('blackjack');
}

function returnToMainMenu() {
    isGameRunning = false;
    isGamePaused = false;
    game.scene.stop('TopDownScene');
    pauseMenu.classList.add('hidden');
    optionsMenu.classList.add('hidden');
    gameoverMenu.classList.add('hidden');
    blackjackScreen.classList.add('hidden');
    cutsceneScreen.classList.add('hidden');
    gameContainer.classList.remove('game-blurred');
    blackjackScreen.classList.remove('game-blurred');

    playTrack('countryDEATHside.mp3');
    mainMenu.classList.remove('hidden');
    mainMenuContent.classList.remove('hidden');
    setMenuState('main');
}

// ====================================================
// NAVEGAÇÃO POR TECLADO E CONTROLE NOS MENUS E BLACKJACK
// ====================================================
function getMenuItems() {
    if (activeMenuState === 'main') {
        return Array.from(mainMenuContent.querySelectorAll('.menu-btn'));
    } else if (activeMenuState === 'pause') {
        return Array.from(pauseMenu.querySelectorAll('.menu-btn'));
    } else if (activeMenuState === 'options') {
        return [volumeSlider, document.getElementById('btn-options-back')];
    } else if (activeMenuState === 'gameover') {
        return Array.from(gameoverMenu.querySelectorAll('.menu-btn'));
    } else if (activeMenuState === 'blackjack') {
        return Array.from(document.querySelectorAll('#blackjack-screen .bj-controls-row:not(.hidden) .menu-btn:not(.hidden)'));
    }
    return [];
}

function updateMenuHighlight() {
    document.querySelectorAll('.menu-btn, .options-box').forEach(el => el.classList.remove('selected'));

    const items = getMenuItems();
    if (items.length === 0) return;

    selectedIndex = Phaser.Math.Wrap(selectedIndex, 0, items.length);
    const currentItem = items[selectedIndex];

    if (currentItem === volumeSlider) {
        optionsBox.classList.add('selected');
    } else if (currentItem) {
        currentItem.classList.add('selected');
    }
}

window.resetMenuSelection = function() {
    selectedIndex = 0;
    updateMenuHighlight();
};

function setMenuState(newState) {
    activeMenuState = newState;
    selectedIndex = 0;
    updateMenuHighlight();
}

function adjustVolumeByStep(step) {
    const currentVal = parseInt(volumeSlider.value, 10);
    const newVal = Phaser.Math.Clamp(currentVal + step, 0, 100);
    volumeSlider.value = newVal;
    bgMusic.volume = newVal / 100;
    volumeValue.textContent = `${newVal}%`;
}

updateMenuHighlight();

document.querySelectorAll('.menu-btn').forEach((btn) => {
    btn.addEventListener('mouseenter', () => {
        const items = getMenuItems();
        const idx = items.indexOf(btn);
        if (idx !== -1) {
            selectedIndex = idx;
            updateMenuHighlight();
        }
    });
});

volumeSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    bgMusic.volume = val / 100;
    volumeValue.textContent = `${val}%`;
});

function quitGame() {
    window.close();
    setTimeout(() => {
        window.location.href = 'about:blank';
    }, 150);
}

// --- BOTÕES DO MENU INICIAL ---
document.getElementById('btn-new-game').addEventListener('click', startIntroCutscene);
document.getElementById('btn-load-game').addEventListener('click', loadGameState);
document.getElementById('btn-options').addEventListener('click', () => {
    optionsOpenedFrom = 'main';
    mainMenuContent.classList.add('hidden');
    optionsMenu.classList.remove('hidden');
    setMenuState('options');
});
document.getElementById('btn-quit').addEventListener('click', quitGame);

// --- BOTÃO BACK DO OPTIONS ---
document.getElementById('btn-options-back').addEventListener('click', () => {
    optionsMenu.classList.add('hidden');
    if (optionsOpenedFrom === 'main') {
        mainMenuContent.classList.remove('hidden');
        setMenuState('main');
    } else {
        pauseMenu.classList.remove('hidden');
        setMenuState('pause');
    }
});

// --- PAUSE E RESUME (Desabilitado em Game Over e Cutscenes) ---
function pauseGame() {
    if (!isGameRunning || isGamePaused) return;
    if (activeMenuState === 'gameover' || activeMenuState === 'cutscene' || activeMenuState === 'main') return;

    isGamePaused = true;
    if (window.currentRunState.scene === 'TopDownScene') {
        game.scene.pause('TopDownScene');
        gameContainer.classList.add('game-blurred');
    } else if (window.currentRunState.scene === 'Blackjack') {
        blackjackScreen.classList.add('game-blurred');
    }
    pauseMenu.classList.remove('hidden');
    setMenuState('pause');
}

function resumeGame() {
    if (!isGameRunning || !isGamePaused) return;
    isGamePaused = false;
    pauseMenu.classList.add('hidden');
    optionsMenu.classList.add('hidden');
    gameContainer.classList.remove('game-blurred');
    blackjackScreen.classList.remove('game-blurred');

    if (window.currentRunState.scene === 'TopDownScene') {
        setMenuState('none');
        game.scene.resume('TopDownScene');
    } else if (window.currentRunState.scene === 'Blackjack') {
        setMenuState('blackjack');
    }
}

// --- BOTÕES DO PAUSE MENU ---
document.getElementById('btn-pause-resume').addEventListener('click', resumeGame);
document.getElementById('btn-pause-save').addEventListener('click', saveGameState);
document.getElementById('btn-pause-load').addEventListener('click', loadGameState);
document.getElementById('btn-pause-options').addEventListener('click', () => {
    optionsOpenedFrom = 'pause';
    pauseMenu.classList.add('hidden');
    optionsMenu.classList.remove('hidden');
    setMenuState('options');
});
document.getElementById('btn-pause-main').addEventListener('click', returnToMainMenu);
document.getElementById('btn-pause-quit').addEventListener('click', quitGame);

// --- BOTÕES DO GAME OVER MENU ---
document.getElementById('btn-gameover-load').addEventListener('click', loadGameState);
document.getElementById('btn-gameover-main').addEventListener('click', returnToMainMenu);
document.getElementById('btn-gameover-quit').addEventListener('click', quitGame);

// --- TECLADO GLOBAL (Menus, Cutscene e Pause) ---
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Pause desabilitado em Game Over, Cutscenes e Menu Inicial
        if (activeMenuState === 'gameover' || activeMenuState === 'cutscene' || activeMenuState === 'main') {
            return;
        }
        if (isGameRunning) {
            if (activeMenuState === 'options') {
                document.getElementById('btn-options-back').click();
                return;
            }
            if (!isGamePaused) pauseGame();
            else resumeGame();
        }
        return;
    }

    const key = e.key.toLowerCase();

    // Confirmação nas Cutscenes / Telas Brancas / Tela Vermelha com L
    if (activeMenuState === 'cutscene') {
        if (key === 'l') {
            advanceCutscene();
        }
        return;
    }

    if (activeMenuState === 'none') return;

    const items = getMenuItems();
    if (items.length === 0) return;

    const isPrev = key === 'w' || e.key === 'ArrowUp' || (activeMenuState === 'blackjack' && (key === 'a' || e.key === 'ArrowLeft'));
    const isNext = key === 's' || e.key === 'ArrowDown' || (activeMenuState === 'blackjack' && (key === 'd' || e.key === 'ArrowRight'));

    if (isPrev) {
        selectedIndex = Phaser.Math.Wrap(selectedIndex - 1, 0, items.length);
        updateMenuHighlight();
    } else if (isNext) {
        selectedIndex = Phaser.Math.Wrap(selectedIndex + 1, 0, items.length);
        updateMenuHighlight();
    } else if ((key === 'a' || e.key === 'ArrowLeft') && items[selectedIndex] === volumeSlider) {
        adjustVolumeByStep(-5);
    } else if ((key === 'd' || e.key === 'ArrowRight') && items[selectedIndex] === volumeSlider) {
        adjustVolumeByStep(5);
    } else if (key === 'l') {
        const current = items[selectedIndex];
        if (current && current !== volumeSlider) {
            current.click();
        }
    }
});

// --- CONTROLE (PS / XBOX) GLOBAL ---
let prevPadUp = false;
let prevPadDown = false;
let prevPadLeft = false;
let prevPadRight = false;
let prevPadConfirm = false; // Bolinha (PS) / B (Xbox)
let prevPadStart = false;

function pollGamepadForMenus() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad = null;
    for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
            pad = gamepads[i];
            break;
        }
    }

    if (pad) {
        const stickX = pad.axes[0] || 0;
        const stickY = pad.axes[1] || 0;

        const isUp = (pad.buttons[12]?.pressed) || (stickY < -0.5);
        const isDown = (pad.buttons[13]?.pressed) || (stickY > 0.5);
        const isLeft = (pad.buttons[14]?.pressed) || (stickX < -0.5);
        const isRight = (pad.buttons[15]?.pressed) || (stickX > 0.5);
        const isConfirm = pad.buttons[1]?.pressed || false;
        const isStart = pad.buttons[9]?.pressed || false;

        if (isStart && !prevPadStart && isGameRunning) {
            if (activeMenuState !== 'gameover' && activeMenuState !== 'cutscene' && activeMenuState !== 'main') {
                if (activeMenuState === 'options') {
                    document.getElementById('btn-options-back').click();
                } else if (!isGamePaused) {
                    pauseGame();
                } else {
                    resumeGame();
                }
            }
        }

        if (activeMenuState === 'cutscene') {
            if (isConfirm && !prevPadConfirm) {
                advanceCutscene();
            }
        } else if (activeMenuState !== 'none') {
            const items = getMenuItems();
            const isPrev = (isUp && !prevPadUp) || (activeMenuState === 'blackjack' && isLeft && !prevPadLeft);
            const isNext = (isDown && !prevPadDown) || (activeMenuState === 'blackjack' && isRight && !prevPadRight);

            if (isPrev && items.length > 0) {
                selectedIndex = Phaser.Math.Wrap(selectedIndex - 1, 0, items.length);
                updateMenuHighlight();
            } else if (isNext && items.length > 0) {
                selectedIndex = Phaser.Math.Wrap(selectedIndex + 1, 0, items.length);
                updateMenuHighlight();
            } else if (isLeft && !prevPadLeft && items[selectedIndex] === volumeSlider) {
                adjustVolumeByStep(-5);
            } else if (isRight && !prevPadRight && items[selectedIndex] === volumeSlider) {
                adjustVolumeByStep(5);
            } else if (isConfirm && !prevPadConfirm) {
                const current = items[selectedIndex];
                if (current && current !== volumeSlider) {
                    current.click();
                }
            }
        }

        prevPadUp = isUp;
        prevPadDown = isDown;
        prevPadLeft = isLeft;
        prevPadRight = isRight;
        prevPadConfirm = isConfirm;
        prevPadStart = isStart;
    }

    requestAnimationFrame(pollGamepadForMenus);
}

requestAnimationFrame(pollGamepadForMenus);
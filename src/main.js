class TopDownScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TopDownScene' });
    }

    preload() {
        this.load.image('cowgirl', 'assets/cowgirl.png');
        this.load.image('whip', 'assets/whip.png');
        this.load.image('skeleton', 'assets/skeleton.png');
        this.load.image('sword', 'assets/sword.png');
    }

    create() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        // Grupo de aliados
        this.allies = this.physics.add.group();

        // Cria a Princess Cowgirl no centro
        this.player = createPlayer(this, centerX, centerY);
        this.allies.add(this.player);

        // Grupo de inimigos
        this.enemies = this.physics.add.group();

        // Spawna o primeiro esqueleto imediatamente em um dos 4 lados aleatórios
        this.spawnFromRandomPoint();

        // Timer que roda a cada 10 segundos (10000 ms)
        this.spawnTimer = this.time.addEvent({
            delay: 10000,
            callback: this.spawnFromRandomPoint,
            callbackScope: this,
            loop: true
        });

        // HUD no canto superior esquerdo
        this.createPlayerHUD();

        this.lastAttackTime = -Infinity;

        // Controles W, A, S, D + J
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            attack: Phaser.Input.Keyboard.KeyCodes.J
        });
    }

    spawnFromRandomPoint() {
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

    createPlayerHUD() {
        const x = 20;
        const hpY = 20;
        const manaY = 54;
        this.hudBarWidth = 220;
        const barHeight = 24;

        // --- BARRA DE VIDA (HEALTH) ---
        this.add.rectangle(x, hpY, this.hudBarWidth + 4, barHeight + 4, 0x000000)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(100);
        this.add.rectangle(x + 2, hpY + 2, this.hudBarWidth, barHeight, 0x2b1115)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(100);
        this.hpBarFill = this.add.rectangle(x + 2, hpY + 2, this.hudBarWidth, barHeight, 0xd9383a)
            .setOrigin(0, 0).setScrollFactor(0).setDepth(101);
        this.hpText = this.add.text(x + 2 + this.hudBarWidth / 2, hpY + 2 + barHeight / 2, '', {
            fontFamily: 'MPLUSRounded1c, monospace',
            fontSize: '15px',
            fontStyle: 'bold',
            fill: '#ffffff',
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
            fontFamily: 'MPLUSRounded1c, monospace',
            fontSize: '15px',
            fontStyle: 'bold',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(102);

        this.updatePlayerHUD();
    }

    updatePlayerHUD() {
        const stats = this.player.stats;

        const hpRatio = Phaser.Math.Clamp(stats.health / stats.maxHealth, 0, 1);
        this.hpBarFill.width = this.hudBarWidth * hpRatio;
        this.hpText.setText(`${stats.health}/${stats.maxHealth}`);

        const manaRatio = Phaser.Math.Clamp(stats.mana / stats.maxMana, 0, 1);
        this.manaBarFill.width = this.hudBarWidth * manaRatio;
        this.manaText.setText(`${stats.mana}/${stats.maxMana}`);
    }

    update(time) {
        this.player.setVelocity(0);

        let velocityX = 0;
        let velocityY = 0;

        if (this.keys.left.isDown) {
            velocityX = -1;
            this.player.setFlipX(true);
            this.player.facingDirection = -1;
        } else if (this.keys.right.isDown) {
            velocityX = 1;
            this.player.setFlipX(false);
            this.player.facingDirection = 1;
        }

        if (this.keys.up.isDown) {
            velocityY = -1;
        } else if (this.keys.down.isDown) {
            velocityY = 1;
        }

        if (velocityX !== 0 || velocityY !== 0) {
            const length = Math.hypot(velocityX, velocityY);
            const speedInPixels = this.player.stats.speed * SIZES.SPEED_UNIT;
            this.player.setVelocity(
                (velocityX / length) * speedInPixels,
                (velocityY / length) * speedInPixels
            );
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.attack)) {
            this.tryBasicAttack(time);
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

        const rangeInPixels = enemy.stats.range * SIZES.RANGE_UNIT;

        if (targetAlly.x < enemy.x) {
            enemy.setFlipX(true);
            enemy.facingDirection = -1;
        } else {
            enemy.setFlipX(false);
            enemy.facingDirection = 1;
        }

        const side = targetAlly.x < enemy.x ? 1 : -1;
        const desiredX = targetAlly.x + (side * rangeInPixels * 0.7);
        const desiredY = targetAlly.y;

        const distToDesired = Phaser.Math.Distance.Between(enemy.x, enemy.y, desiredX, desiredY);
        const speedInPixels = enemy.stats.speed * SIZES.SPEED_UNIT;

        if (distToDesired > 4) {
            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, desiredX, desiredY);
            enemy.setVelocity(
                Math.cos(angle) * speedInPixels,
                Math.sin(angle) * speedInPixels
            );
        } else {
            enemy.setVelocity(0);
        }

        const horizontalDist = Math.abs(targetAlly.x - enemy.x);
        const verticalDist = Math.abs(targetAlly.y - enemy.y);

        const inHorizontalRange = horizontalDist <= (rangeInPixels + SIZES.CHARACTER * 0.4);
        const inVerticalAlignment = verticalDist <= (SIZES.CHARACTER * 0.5);

        if (
            inHorizontalRange &&
            inVerticalAlignment &&
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

            const hitboxX = enemy.x + (enemy.facingDirection * (rangeInPixels / 2));
            const hitboxY = enemy.y;

            const slashVisual = this.add.rectangle(
                hitboxX,
                hitboxY,
                rangeInPixels,
                SIZES.CHARACTER,
                0xff4444,
                0.45
            );
            this.physics.add.existing(slashVisual);

            const hitAllies = new Set();

            this.physics.overlap(slashVisual, this.allies, (hitbox, ally) => {
                if (!hitAllies.has(ally)) {
                    hitAllies.add(ally);
                    ally.takeDamage(enemy.stats.dmg);
                }
            });

            this.time.delayedCall(150, () => {
                slashVisual.destroy();
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

        const hitboxX = this.player.x + (this.player.facingDirection * (rangeInPixels / 2));
        const hitboxY = this.player.y;

        const attackVisual = this.add.rectangle(
            hitboxX,
            hitboxY,
            rangeInPixels,
            SIZES.CHARACTER,
            0xf28db2,
            0.35
        );
        this.physics.add.existing(attackVisual);

        const hitEnemies = new Set();

        this.physics.overlap(attackVisual, this.enemies, (hitbox, enemy) => {
            if (!hitEnemies.has(enemy)) {
                hitEnemies.add(enemy);
                enemy.takeDamage(this.player.stats.dmg);
            }
        });

        this.time.delayedCall(150, () => {
            attackVisual.destroy();
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
    // Note que removemos scene: [TopDownScene] daqui para ela não iniciar sozinha antes do clique!
};

const game = new Phaser.Game(config);
// Adicionamos a cena no jogo, mas deixamos em espera (false) até clicar em NEW GAME
game.scene.add('TopDownScene', TopDownScene, false);

// --- LÓGICA DOS BOTÕES DO MENU INICIAL ---
document.getElementById('btn-new-game').addEventListener('click', () => {
    // Esconde o menu inicial
    document.getElementById('main-menu').style.display = 'none';
    // Inicia a cena que programamos!
    game.scene.start('TopDownScene');
});

document.getElementById('btn-load-game').addEventListener('click', () => {
    // Ainda não mexemos
    console.log('Load Game clicked');
});

document.getElementById('btn-options').addEventListener('click', () => {
    // Ainda não mexemos
    console.log('Options clicked');
});

document.getElementById('btn-quit').addEventListener('click', () => {
    // Tenta fechar a aba do navegador
    window.close();

    // Fallback: se o navegador bloquear o fechamento de abas não abertas via script, redireciona para aba em branco
    setTimeout(() => {
        window.location.href = 'about:blank';
    }, 150);
});
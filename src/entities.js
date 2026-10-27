// Dimensões e unidades padronizadas
const SIZES = {
    CHARACTER: 64,
    WEAPON: 48,
    RANGE_UNIT: 64, // 1 de range = 64 pixels
    SPEED_UNIT: 110 // 1 de speed = 110 pixels por segundo
};

// Moldes de atributos (Status Base)
const ENTITY_TEMPLATES = {
    cowgirl: {
        health: 100,
        maxHealth: 100,
        mana: 100,
        maxMana: 100,
        baseDmg: 10,
        dmg: 10,
        baseRange: 1,
        range: 1,
        baseSpeed: 2,
        speed: 2,
        attackCooldown: 1000 // 1 segundo
    },
    skeleton: {
        health: 20,
        maxHealth: 20,
        mana: 0,
        dmg: 5,
        range: 1,
        speed: 1,
        attackCooldown: 2000, // 2 segundos
        attackDelay: 250      // 0.25 segundo de preparação
    }
};

// Cria a Princess Cowgirl (aceita savedStats caso venha de um Load Game)
function createPlayer(scene, x, y, savedStats = null) {
    const initialTexture = scene.textures.exists('cowgirl_front_1') ? 'cowgirl_front_1' : 'cowgirl';
    const player = scene.physics.add.sprite(x, y, initialTexture);
    player.setDisplaySize(SIZES.CHARACTER, SIZES.CHARACTER);

    player.stats = savedStats ? { ...savedStats } : { ...ENTITY_TEMPLATES.cowgirl };

    player.facingX = 0;
    player.facingY = 1;
    player.lastVerticalLook = 'front';

    player.updateEquipmentStats = function(dmgBonus = 0, rangeBonus = 0, speedBonus = 0) {
        this.stats.dmg = this.stats.baseDmg + dmgBonus;
        this.stats.range = this.stats.baseRange + rangeBonus;
        this.stats.speed = this.stats.baseSpeed + speedBonus;
    };

    player.takeDamage = function(amount) {
        if (!this.active) return;

        this.stats.health = Math.max(0, this.stats.health - amount);

        this.setTint(0xff5555);
        scene.time.delayedCall(150, () => {
            if (this.active) this.clearTint();
        });

        if (scene.updatePlayerHUD) {
            scene.updatePlayerHUD();
        }

        // Se a vida zerar, dispara a tela de Game Over
        if (this.stats.health <= 0 && typeof window.triggerGameOver === 'function') {
            window.triggerGameOver();
        }
    };

    return player;
}

// Clona Esqueletos
function spawnSkeleton(scene, group, x, y) {
    const skeleton = group.create(x, y, 'skeleton');
    skeleton.setDisplaySize(SIZES.CHARACTER, SIZES.CHARACTER);

    skeleton.stats = { ...ENTITY_TEMPLATES.skeleton };
    skeleton.lastAttackTime = -Infinity;
    skeleton.isWindingUp = false;
    skeleton.facingX = -1;
    skeleton.facingY = 0;

    // Barra de vida fina acima da cabeça
    const barWidth = 50;
    const barHeight = 6;
    skeleton.hpBarBg = scene.add.rectangle(x, y - 42, barWidth + 2, barHeight + 2, 0x000000);
    skeleton.hpBarFill = scene.add.rectangle(x - barWidth / 2, y - 42, barWidth, barHeight, 0xe74c3c);
    skeleton.hpBarFill.setOrigin(0, 0.5);

    skeleton.updateHealthBarPosition = function() {
        if (!this.active) return;
        this.hpBarBg.setPosition(this.x, this.y - 42);
        this.hpBarFill.setPosition(this.x - barWidth / 2, this.y - 42);
    };

    skeleton.takeDamage = function(amount) {
        if (!this.active) return;

        this.stats.health = Math.max(0, this.stats.health - amount);

        const healthRatio = this.stats.health / this.stats.maxHealth;
        this.hpBarFill.width = barWidth * healthRatio;

        this.setTint(0xff5555);
        scene.time.delayedCall(150, () => {
            if (this.active) {
                if (this.isWindingUp) {
                    this.setTint(0xffdd88);
                } else {
                    this.clearTint();
                }
            }
        });

        if (this.stats.health <= 0) {
            this.hpBarBg.destroy();
            this.hpBarFill.destroy();
            this.destroy();

            if (scene.onSkeletonKilled) {
                scene.onSkeletonKilled();
            }
        }
    };

    return skeleton;
}
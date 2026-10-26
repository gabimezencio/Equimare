// Dimensões e unidades padronizadas
const SIZES = {
    CHARACTER: 64,
    WEAPON: 48,
    RANGE_UNIT: 64, // 1 de range = 64 pixels
    SPEED_UNIT: 110 // 1 de speed = 110 pixels por segundo (speed 2 = 220)
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
        baseSpeed: 2,         // Velocidade base da Princess Cowgirl = 2
        speed: 2,             // Calculado como: baseSpeed + bônus de equipamento
        attackCooldown: 1000  // 1 segundo (1000 ms)
    },
    skeleton: {
        health: 20,
        maxHealth: 20,
        mana: 0,
        dmg: 5,
        range: 1,
        speed: 1,             // Velocidade do Esqueleto = 1
        attackCooldown: 2000, // 2 segundos entre ataques (2000 ms)
        attackDelay: 250      // 0.25 segundo de preparação antes do golpe sair (250 ms)
    }
};

// Função que cria a Princess Cowgirl
function createPlayer(scene, x, y) {
    const player = scene.physics.add.sprite(x, y, 'cowgirl');
    player.setDisplaySize(SIZES.CHARACTER, SIZES.CHARACTER);

    player.stats = { ...ENTITY_TEMPLATES.cowgirl };
    player.facingDirection = 1; // 1 = Direita, -1 = Esquerda

    // Atualiza atributos quando equipar itens no futuro
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
    };

    return player;
}

// Função "Fábrica" para clonar Esqueletos
function spawnSkeleton(scene, group, x, y) {
    const skeleton = group.create(x, y, 'skeleton');
    skeleton.setDisplaySize(SIZES.CHARACTER, SIZES.CHARACTER);

    skeleton.stats = { ...ENTITY_TEMPLATES.skeleton };
    skeleton.lastAttackTime = -Infinity;
    skeleton.isWindingUp = false; // Controla se ele está preparando o golpe (delay)
    skeleton.facingDirection = -1;

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
                // Se estava preparando ataque, volta para o tom de aviso, senão limpa a cor
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
        }
    };

    return skeleton;
}
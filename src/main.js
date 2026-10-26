class TopDownScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TopDownScene' });
    }

    // 1. Carrega os arquivos de imagem antes da fase começar
    preload() {
        this.load.image('cowgirl', 'assets/cowgirl.png');
        this.load.image('whip', 'assets/whip.png');
        this.load.image('skeleton', 'assets/skeleton.png');
        this.load.image('sword', 'assets/sword.png');
    }

    // 2. Posiciona os elementos na tela quando a fase inicia
    create() {
        // Texto no canto superior (em inglês, conforme planejado)
        this.add.text(16, 16, 'Equimare - Use W, A, S, D to move', {
            fontSize: '18px',
            fill: '#ffffff'
        });

        // Cria a Princess Cowgirl no centro da tela (400, 300) com física ativa
        this.player = this.physics.add.sprite(400, 300, 'cowgirl');
        
        // Ajusta o tamanho da imagem na tela (ajuste o 0.12 se achar grande ou pequeno)
        this.player.setScale(0.12);
        
        // Impede que ela saia pelas bordas da janela
        this.player.setCollideWorldBounds(true);

        // Coloca um esqueleto parado de teste no mapa para referência visual
        this.testEnemy = this.physics.add.sprite(600, 300, 'skeleton');
        this.testEnemy.setScale(0.10);

        // Registra as teclas W, A, S, D
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        // Velocidade da personagem
        this.playerSpeed = 200;
    }

    // 3. Roda 60 vezes por segundo (checa botões apertados e atualiza posição)
    update() {
        // Zera a velocidade quando solta as teclas
        this.player.setVelocity(0);

        let velocityX = 0;
        let velocityY = 0;

        // Checa Horizontal (A e D)
        if (this.keys.left.isDown) {
            velocityX = -1;
            this.player.setFlipX(true); // Vira o sprite para a esquerda
        } else if (this.keys.right.isDown) {
            velocityX = 1;
            this.player.setFlipX(false); // Vira o sprite para a direita
        }

        // Checa Vertical (W e S)
        if (this.keys.up.isDown) {
            velocityY = -1;
        } else if (this.keys.down.isDown) {
            velocityY = 1;
        }

        // Normaliza a velocidade diagonal para não correr mais rápido na diagonal
        if (velocityX !== 0 || velocityY !== 0) {
            const length = Math.hypot(velocityX, velocityY);
            this.player.setVelocity(
                (velocityX / length) * this.playerSpeed,
                (velocityY / length) * this.playerSpeed
            );
        }
    }
}

// Configuração geral do Phaser
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#2c3e50', // Fundo da fase
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // Gravidade zero pois a visão é vista de cima (Top-Down)
            debug: false
        }
    },
    scene: [TopDownScene]
};

// Inicia o jogo
const game = new Phaser.Game(config);
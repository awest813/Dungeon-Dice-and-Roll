import Phaser from 'phaser';
import { AVATAR_SIZE, DEPTH_AVATAR_BASE, DEPTH_SHADOW, FONT, COL_TRIM } from '../../game/constants';
import { SoundManager } from './SoundManager';

export class StationaryNPC {
    private scene: Phaser.Scene;
    public x: number;
    public y: number;
    public name: string;
    private textureKey: string;
    private auraColor: number;

    private shadow!: Phaser.GameObjects.Ellipse;
    private aura!: Phaser.GameObjects.Ellipse;
    private sprite!: Phaser.GameObjects.Image;
    private nameTag!: Phaser.GameObjects.Text;

    private quotes: string[];
    private activeBubble: Phaser.GameObjects.Container | null = null;
    private bubbleTimer: Phaser.Time.TimerEvent | null = null;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        name: string,
        textureKey: string,
        auraColor: number,
        quotes: string[]
    ) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.name = name;
        this.textureKey = textureKey;
        this.auraColor = auraColor;
        this.quotes = quotes;

        this.build();
    }

    private build(): void {
        const r = AVATAR_SIZE;

        // Shadow
        this.shadow = this.scene.add
            .ellipse(this.x, this.y + r - 2, r * 2, r * 0.8, 0x000000, 0.30)
            .setDepth(DEPTH_SHADOW);

        // Aura glow
        this.aura = this.scene.add
            .ellipse(this.x, this.y - 2, r * 2.3, r * 2.75, this.auraColor, 0.08)
            .setDepth(DEPTH_AVATAR_BASE - 2)
            .setBlendMode(Phaser.BlendModes.ADD);

        // Chibi Sprite
        this.sprite = this.scene.add.image(this.x, this.y, this.textureKey);
        this.sprite.setOrigin(0.5, 0.72);
        this.sprite.setDisplaySize(30, 44);
        this.sprite.setDepth(DEPTH_AVATAR_BASE);

        // Name tag
        this.nameTag = this.scene.add
            .text(this.x, this.y - r * 2.2, this.name, {
                fontFamily: FONT,
                fontSize: '10px',
                color: '#f0e6d3',
                fontStyle: 'bold',
            })
            .setOrigin(0.5, 1)
            .setDepth(DEPTH_AVATAR_BASE + 3);

        // Apply depth sort sorting based on y-coordinate
        const depth = DEPTH_AVATAR_BASE + this.y * 0.1;
        this.shadow.setDepth(depth - 5);
        this.aura.setDepth(depth - 2);
        this.sprite.setDepth(depth);
        this.nameTag.setDepth(depth + 3);
    }

    public interact(customQuote?: string): void {
        // Clear old bubble
        if (this.activeBubble) {
            this.activeBubble.destroy();
            this.activeBubble = null;
        }
        if (this.bubbleTimer) {
            this.bubbleTimer.remove();
            this.bubbleTimer = null;
        }

        const quote = customQuote || this.quotes[Math.floor(Math.random() * this.quotes.length)];
        
        // Play click chime sound
        SoundManager.playClick();

        // Create text object first to get measurements
        const text = this.scene.add.text(0, 0, quote, {
            fontFamily: FONT,
            fontSize: '10px',
            color: '#0a0d14',
            align: 'center',
            wordWrap: { width: 140 }
        }).setOrigin(0.5);

        const bw = Math.max(70, text.width + 16);
        const bh = text.height + 12;
        const br = 6;

        const bubbleGfx = this.scene.add.graphics();
        // shadow
        bubbleGfx.fillStyle(0x000000, 0.22);
        bubbleGfx.fillRoundedRect(-bw / 2 + 1, -bh / 2 + 2, bw, bh, br);
        // bubble container
        bubbleGfx.fillStyle(0xf0e6d3, 0.98);
        bubbleGfx.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, br);
        bubbleGfx.fillTriangle(0, bh / 2 + 5, -5, bh / 2 - 2, 5, bh / 2 - 2);
        // gold trim
        bubbleGfx.lineStyle(1.5, COL_TRIM, 0.9);
        bubbleGfx.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, br);

        text.setPosition(0, -1);

        const bx = this.x;
        const by = this.y - AVATAR_SIZE * 2.2 - bh / 2 - 4;

        const depth = DEPTH_AVATAR_BASE + this.y * 0.1;

        this.activeBubble = this.scene.add.container(bx, by, [bubbleGfx, text])
            .setDepth(depth + 10)
            .setScale(0);

        // Scale pop pop-in
        this.scene.tweens.add({
            targets: this.activeBubble,
            scaleX: 1,
            scaleY: 1,
            duration: 180,
            ease: 'Back.easeOut'
        });

        // Auto destroy after 4.5 seconds
        this.bubbleTimer = this.scene.time.delayedCall(4500, () => {
            this.fadeBubble();
        });
    }

    private fadeBubble(): void {
        if (!this.activeBubble) return;
        this.scene.tweens.add({
            targets: this.activeBubble,
            alpha: 0,
            scaleX: 0.8,
            scaleY: 0.8,
            duration: 220,
            onComplete: () => {
                if (this.activeBubble) {
                    this.activeBubble.destroy();
                    this.activeBubble = null;
                }
            }
        });
    }

    public setPosition(x: number, y: number): void {
        this.x = x;
        this.y = y;
        const r = AVATAR_SIZE;
        this.shadow.setPosition(x, y + r - 2);
        this.aura.setPosition(x, y - 2);
        this.sprite.setPosition(x, y);
        this.nameTag.setPosition(x, y - r * 2.2);

        const depth = DEPTH_AVATAR_BASE + y * 0.1;
        this.shadow.setDepth(depth - 5);
        this.aura.setDepth(depth - 2);
        this.sprite.setDepth(depth);
        this.nameTag.setDepth(depth + 3);
    }

    public destroy(): void {
        if (this.activeBubble) {
            this.activeBubble.destroy();
        }
        if (this.bubbleTimer) {
            this.bubbleTimer.remove();
        }
        this.shadow.destroy();
        this.aura.destroy();
        this.sprite.destroy();
        this.nameTag.destroy();
    }
}

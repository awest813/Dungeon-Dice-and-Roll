import Phaser from 'phaser';
import {
    AVATAR_SPEED, AVATAR_SIZE, WORLD_W, WORLD_H,
    DEPTH_AVATAR_BASE, DEPTH_SHADOW, FONT,
} from '../../game/constants';

interface Blocker {
    x: number; y: number; w: number; h: number;
}

type FacingDir = 'down' | 'up' | 'left' | 'right';

// Walkable waypoints spread around the casino floor (avoiding furniture)
const WAYPOINTS: [number, number][] = [
    [480, 630], // entrance center
    [340, 460], // center-left open floor
    [640, 460], // center-right open floor
    [480, 460], // center open floor
    [160, 350], // slots zone walkway
    [230, 500], // left corridor
    [800, 350], // poker zone walkway
    [870, 480], // right corridor
    [480, 540], // pre-entrance corridor
    [160, 530], // roulette area
    [400, 300], // blackjack approach
    [560, 300], // blackjack right side
    [240, 160], // bar left approach
    [720, 160], // bar right approach
    [790, 515], // plinko area
];

export const AI_NAMES  = ['Alex', 'Jamie', 'Morgan', 'Riley', 'Casey', 'Jordan', 'Taylor', 'Sam'];
export const AI_COLORS = [0x4488cc, 0xcc5544, 0x44cc88, 0xcc8844, 0x9955cc, 0x44b844, 0xcc4488, 0x66aabb];

const WALK_COMMENTS = [
    "Lady luck, where are you? 🍀",
    "I need a cold drink from the bar! 🍹",
    "Let's see if the slots are hot! 🎰",
    "Pocket Aces is the dream... ♠",
    "Double down on 11! 🃏",
    "Red or black... roulette is calling! 🎡",
    "Bingo blackout is so close! 🎱",
    "I'm feeling lucky! ✨",
    "Time to tip the bartender. 💵",
    "Look at those showgirls, gorgeous! 💃",
    "Let's bet on the underdog horse! 🏇",
    "Almost hit a Plinko 10x! 🎯",
];

export class AIWalker {
    private scene:    Phaser.Scene;
    private aura!:    Phaser.GameObjects.Ellipse;
    private sprite!:  Phaser.GameObjects.Image;
    private walkTime: number = 0;
    private shadow!:  Phaser.GameObjects.Ellipse;
    private nameTag!: Phaser.GameObjects.Text;
    private blockers: Blocker[] = [];
    private activeBubble: Phaser.GameObjects.Container | null = null;
    private bubbleTimer: Phaser.Time.TimerEvent | null = null;
    private bubbleOffsetY: number = 0;

    x: number;
    y: number;

    private facing:     FacingDir = 'down';
    private targetX:    number;
    private targetY:    number;
    private pauseTimer: number = 0;
    private stuckTimer: number = 0;
    private bodyColor:  number;

    constructor(
        scene: Phaser.Scene,
        startX: number, startY: number,
        name: string,
        bodyColor: number,
    ) {
        this.scene     = scene;
        this.x         = startX;
        this.y         = startY;
        this.bodyColor = bodyColor;

        const wp    = WAYPOINTS[Math.floor(Math.random() * WAYPOINTS.length)];
        this.targetX = wp[0];
        this.targetY = wp[1];

        this.buildSprite(name);
    }

    private buildSprite(name: string): void {
        const r = AVATAR_SIZE;

        this.shadow = this.scene.add
            .ellipse(this.x, this.y + r - 2, r * 2, r * 0.8, 0x000000, 0.30)
            .setDepth(DEPTH_SHADOW);

        // Select visitor avatar sprite based on index modulo 3
        const idx = AI_NAMES.indexOf(name);
        let key = 'avatar_ai_male';
        let auraColor = this.bodyColor;
        let nameColorStr = Phaser.Display.Color.IntegerToColor(this.bodyColor).rgba;
        let isBold = false;
        let labelName = name;

        if (idx % 3 === 0) {
            key = 'avatar_ai_male';
        } else if (idx % 3 === 1) {
            key = 'avatar_ai_female';
        } else {
            key = 'avatar_ai_vip';
            auraColor = 0xd4af37;      // Glowing luxury gold neon aura
            nameColorStr = '#ffd700';   // Elegant gold color
            isBold = true;
            labelName = `${name} 👑`;
        }

        this.aura = this.scene.add
            .ellipse(this.x, this.y - 2, r * 2.3, r * 2.75, auraColor, key === 'avatar_ai_vip' ? 0.12 : 0.08)
            .setDepth(DEPTH_AVATAR_BASE - 2)
            .setBlendMode(Phaser.BlendModes.ADD);

        this.sprite = this.scene.add.image(this.x, this.y, key);
        this.sprite.setOrigin(0.5, 0.72);
        this.sprite.setDisplaySize(30, 44);
        this.sprite.setDepth(DEPTH_AVATAR_BASE);

        this.nameTag = this.scene.add
            .text(this.x, this.y - r * 2.2, labelName, {
                fontFamily: FONT,
                fontSize:   '10px',
                color:      nameColorStr,
                fontStyle:  isBold ? 'bold' : 'normal',
            })
            .setOrigin(0.5, 1)
            .setDepth(DEPTH_AVATAR_BASE + 3);
    }

    addBlocker(b: Blocker): void {
        this.blockers.push(b);
    }

    setBlockers(blockers: Blocker[]): void {
        this.blockers = [...blockers];
    }

    private resolveBlockers(nx: number, ny: number): { x: number; y: number } {
        let rx = nx;
        let ry = ny;
        const r = AVATAR_SIZE;

        for (const b of this.blockers) {
            const cx    = Math.max(b.x, Math.min(rx, b.x + b.w));
            const cy    = Math.max(b.y, Math.min(ry, b.y + b.h));
            const dx    = rx - cx;
            const dy    = ry - cy;
            const dist2 = dx * dx + dy * dy;

            if (dist2 < r * r) {
                const dist    = Math.sqrt(dist2) || 1;
                const overlap = r - dist;
                rx += (dx / dist) * overlap;
                ry += (dy / dist) * overlap;
            }
        }

        rx = Phaser.Math.Clamp(rx, r, WORLD_W - r);
        ry = Phaser.Math.Clamp(ry, r, WORLD_H - r);

        return { x: rx, y: ry };
    }

    private pickNewTarget(): void {
        const wp     = WAYPOINTS[Math.floor(Math.random() * WAYPOINTS.length)];
        this.targetX = wp[0] + (Math.random() - 0.5) * 60;
        this.targetY = wp[1] + (Math.random() - 0.5) * 60;
    }

    update(delta: number): void {
        const dt = delta / 1000;

        // Pause at destination
        if (this.pauseTimer > 0) {
            this.pauseTimer -= delta;
            this.walkTime = 0;
            this.syncSprite();
            return;
        }

        this.walkTime += delta;

        const dx   = this.targetX - this.x;
        const dy   = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Arrived — rest briefly then pick a new goal
        if (dist < 10) {
            this.pauseTimer = 600 + Math.random() * 2400;
            this.pickNewTarget();
            if (Math.random() < 0.18) {
                this.speakRandomComment();
            }
            this.syncSprite();
            return;
        }

        // Update facing
        if (Math.abs(dx) > Math.abs(dy)) {
            this.facing = dx > 0 ? 'right' : 'left';
        } else {
            this.facing = dy > 0 ? 'down' : 'up';
        }

        const speed = AVATAR_SPEED * 0.65;
        const vx    = (dx / dist) * speed * dt;
        const vy    = (dy / dist) * speed * dt;

        const resolved = this.resolveBlockers(this.x + vx, this.y + vy);

        // Detect if stuck (e.g. blocked by obstacle) and reroute
        const moved = Math.abs(resolved.x - this.x) + Math.abs(resolved.y - this.y);
        if (moved < 0.05 && dist > 20) {
            this.stuckTimer += delta;
            if (this.stuckTimer > 400) {
                this.stuckTimer = 0;
                this.pickNewTarget();
            }
        } else {
            this.stuckTimer = 0;
        }

        this.x = resolved.x;
        this.y = resolved.y;

        this.syncSprite();
    }

    private syncSprite(): void {
        const r = AVATAR_SIZE;

        this.shadow.setPosition(this.x, this.y + r - 2);
        this.aura.setPosition(this.x, this.y - 2);

        // Chibi bobbing walking animation
        let bobY = 0;
        if (this.pauseTimer <= 0) {
            bobY = Math.sin(this.walkTime * 0.016) * 3.4;
        }

        // Horizontal flip depending on traveling direction
        if (this.facing === 'left') {
            this.sprite.setFlipX(true);
        } else if (this.facing === 'right') {
            this.sprite.setFlipX(false);
        }

        this.sprite.setPosition(this.x, this.y + bobY);
        this.nameTag.setPosition(this.x, this.y - r * 2.4 + bobY);

        const depth = DEPTH_AVATAR_BASE + this.y * 0.1;
        this.aura.setDepth(depth - 2);
        this.sprite.setDepth(depth);
        this.nameTag.setDepth(depth + 3);
        this.shadow.setDepth(depth - 5);

        if (this.activeBubble) {
            this.activeBubble.setPosition(this.x, this.y + this.bubbleOffsetY + bobY);
            this.activeBubble.setDepth(depth + 10);
        }
    }

    private speakRandomComment(): void {
        if (this.activeBubble) {
            this.activeBubble.destroy();
            this.activeBubble = null;
        }
        if (this.bubbleTimer) {
            this.bubbleTimer.remove();
            this.bubbleTimer = null;
        }

        const comment = WALK_COMMENTS[Math.floor(Math.random() * WALK_COMMENTS.length)];
        
        const r = AVATAR_SIZE;
        const text = this.scene.add.text(0, 0, comment, {
            fontFamily: FONT,
            fontSize: '9px',
            color: '#0a0d14',
            align: 'center',
            wordWrap: { width: 110 }
        }).setOrigin(0.5);

        const bw = Math.max(60, text.width + 12);
        const bh = text.height + 8;
        const br = 4;

        const bubbleGfx = this.scene.add.graphics();
        // shadow
        bubbleGfx.fillStyle(0x000000, 0.15);
        bubbleGfx.fillRoundedRect(-bw / 2 + 1, -bh / 2 + 1, bw, bh, br);
        // bubble
        bubbleGfx.fillStyle(0xfcf8f2, 0.95);
        bubbleGfx.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, br);
        bubbleGfx.fillTriangle(0, bh / 2 + 4, -4, bh / 2 - 2, 4, bh / 2 - 2);
        // border
        bubbleGfx.lineStyle(1.0, 0x908070, 0.6);
        bubbleGfx.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, br);

        text.setPosition(0, -1);

        this.bubbleOffsetY = -r * 2.2 - bh / 2 - 2;
        const bx = this.x;
        const by = this.y + this.bubbleOffsetY;

        const depth = DEPTH_AVATAR_BASE + this.y * 0.1;

        this.activeBubble = this.scene.add.container(bx, by, [bubbleGfx, text])
            .setDepth(depth + 10)
            .setScale(0);

        this.scene.tweens.add({
            targets: this.activeBubble,
            scaleX: 1,
            scaleY: 1,
            duration: 150,
            ease: 'Back.easeOut'
        });

        this.bubbleTimer = this.scene.time.delayedCall(2500, () => {
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
            duration: 200,
            onComplete: () => {
                if (this.activeBubble) {
                    this.activeBubble.destroy();
                    this.activeBubble = null;
                }
            }
        });
    }

    destroy(): void {
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

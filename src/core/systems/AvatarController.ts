import Phaser from 'phaser';
import {
    AVATAR_SPEED, AVATAR_SIZE, WORLD_W, WORLD_H,
    COL_TRIM, DEPTH_AVATAR_BASE, DEPTH_SHADOW,
    COL_NEON_BLUE, COL_NEON_PINK,
} from '../../game/constants';
import { GameState } from '../state/GameState';

interface Blocker {
    x: number; y: number; w: number; h: number;
}

export type FacingDir = 'down' | 'up' | 'left' | 'right';

export class AvatarController {
    private scene: Phaser.Scene;
    private aura!: Phaser.GameObjects.Ellipse;
    private pinkFloorGlow!: Phaser.GameObjects.Ellipse;
    private sprite!: Phaser.GameObjects.Image;
    private walkTime = 0;
    private shadow!: Phaser.GameObjects.Ellipse;
    private nameTag!: Phaser.GameObjects.Text;
    private blockers: Blocker[] = [];
    private emoteBubble: Phaser.GameObjects.Container | null = null;

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };

    x: number;
    y: number;
    facing: FacingDir = 'down';
    isMoving: boolean = false;
    enabled: boolean = true;
    private targetPos: { x: number, y: number } | null = null;

    private trailTimer = 0;

    constructor(scene: Phaser.Scene, startX: number, startY: number, displayName: string) {
        this.scene = scene;
        this.x = startX;
        this.y = startY;

        this.buildSprite(displayName);

        this.cursors = scene.input.keyboard!.createCursorKeys();
        this.wasd = {
            up:    scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down:  scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left:  scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        };
    }

    private buildSprite(displayName: string): void {
        // Shadow
        this.shadow = this.scene.add.ellipse(this.x, this.y + AVATAR_SIZE - 2, AVATAR_SIZE * 2, AVATAR_SIZE * 0.8, 0x000000, 0.35)
            .setDepth(DEPTH_SHADOW);

        this.pinkFloorGlow = this.scene.add.ellipse(this.x, this.y + AVATAR_SIZE * 0.55, AVATAR_SIZE * 2.4, AVATAR_SIZE * 0.7, COL_NEON_PINK, 0.12)
            .setDepth(DEPTH_AVATAR_BASE - 3)
            .setBlendMode(Phaser.BlendModes.ADD);

        this.aura = this.scene.add.ellipse(this.x, this.y - 2, AVATAR_SIZE * 2.8, AVATAR_SIZE * 3.3, COL_NEON_BLUE, 0.14)
            .setDepth(DEPTH_AVATAR_BASE - 1)
            .setBlendMode(Phaser.BlendModes.ADD);

        // Main Chibi Character Sprite overlay
        const tex = GameState.get().avatarTextureKey || 'avatar_player';
        this.sprite = this.scene.add.image(this.x, this.y, tex);
        this.sprite.setOrigin(0.5, 0.72); // center on feet pivot
        this.sprite.setDisplaySize(30, 44);
        this.sprite.setDepth(DEPTH_AVATAR_BASE);

        // Name tag
        this.nameTag = this.scene.add.text(this.x, this.y - AVATAR_SIZE * 2.2, displayName, {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#c9a84c',
        }).setOrigin(0.5, 1).setDepth(DEPTH_AVATAR_BASE + 4);
        this.nameTag.setShadow(0, 1, '#000000', 3, false, true);
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
            // Closest point on blocker rect to avatar center
            const cx = Math.max(b.x, Math.min(rx, b.x + b.w));
            const cy = Math.max(b.y, Math.min(ry, b.y + b.h));
            const dx = rx - cx;
            const dy = ry - cy;
            const dist2 = dx * dx + dy * dy;

            if (dist2 < r * r) {
                const dist = Math.sqrt(dist2) || 1;
                const overlap = r - dist;
                rx += (dx / dist) * overlap;
                ry += (dy / dist) * overlap;
            }
        }

        // World bounds
        rx = Phaser.Math.Clamp(rx, r, WORLD_W - r);
        ry = Phaser.Math.Clamp(ry, r, WORLD_H - r);

        return { x: rx, y: ry };
    }

    setTarget(x: number, y: number): void {
        this.targetPos = { x, y };
    }

    update(delta: number): void {
        if (!this.enabled) {
            this.isMoving = false;
            this.walkTime = 0;
            this.syncSprite();
            return;
        }

        const dt = delta / 1000;
        let vx = 0;
        let vy = 0;

        const left  = this.cursors.left.isDown  || this.wasd.left.isDown;
        const right = this.cursors.right.isDown || this.wasd.right.isDown;
        const up    = this.cursors.up.isDown    || this.wasd.up.isDown;
        const down  = this.cursors.down.isDown  || this.wasd.down.isDown;

        // Cancel click-to-move if keyboard is used
        if (left || right || up || down) {
            this.targetPos = null;
        }

        if (this.targetPos) {
            const dx = this.targetPos.x - this.x;
            const dy = this.targetPos.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 4) {
                this.targetPos = null;
            } else {
                vx = dx / dist;
                vy = dy / dist;
                if (Math.abs(vx) > Math.abs(vy)) {
                    this.facing = vx > 0 ? 'right' : 'left';
                } else {
                    this.facing = vy > 0 ? 'down' : 'up';
                }
            }
        } else {
            if (left)  { vx -= 1; this.facing = 'left';  }
            if (right) { vx += 1; this.facing = 'right'; }
            if (up)    { vy -= 1; this.facing = 'up';    }
            if (down)  { vy += 1; this.facing = 'down';  }
        }

        this.isMoving = vx !== 0 || vy !== 0;

        if (this.isMoving) {
            // Normalize diagonal
            const mag = Math.sqrt(vx * vx + vy * vy);
            vx = (vx / mag) * AVATAR_SPEED * dt;
            vy = (vy / mag) * AVATAR_SPEED * dt;

            const oldX = this.x;
            const oldY = this.y;
            const resolved = this.resolveBlockers(this.x + vx, this.y + vy);
            this.x = resolved.x;
            this.y = resolved.y;

            if (this.targetPos && Math.abs(this.x - oldX) < 0.1 && Math.abs(this.y - oldY) < 0.1) {
                this.targetPos = null;
            }

            // Footstep trail
            this.trailTimer += delta;
            if (this.trailTimer >= 90) {
                this.trailTimer = 0;
                this.emitTrailParticle();
            }
        } else {
            this.trailTimer = 0;
        }

        if (this.isMoving) {
            this.walkTime += delta;
        } else {
            this.walkTime = 0;
        }

        this.syncSprite();
    }

    private syncSprite(): void {
        const tex = GameState.get().avatarTextureKey || 'avatar_player';
        if (this.sprite.texture.key !== tex) {
            this.sprite.setTexture(tex);
        }

        const r = AVATAR_SIZE;

        this.shadow.setPosition(this.x, this.y + r - 2);
        this.pinkFloorGlow.setPosition(this.x, this.y + r * 0.55).setAlpha(this.isMoving ? 0.2 : 0.12);
        this.aura.setPosition(this.x, this.y - 2).setAlpha(this.isMoving ? 0.22 : 0.14);

        // Chibi Bobbing Animation
        let bobY = 0;
        if (this.isMoving) {
            bobY = Math.sin(this.walkTime * 0.016) * 3.4;
        }

        // Horizontal flip on walking direction
        if (this.facing === 'left') {
            this.sprite.setFlipX(true);
        } else if (this.facing === 'right') {
            this.sprite.setFlipX(false);
        }

        this.sprite.setPosition(this.x, this.y + bobY);
        this.nameTag.setPosition(this.x, this.y - r * 2.4 + bobY);

        // Update active emote bubble positioning & depth dynamically
        if (this.emoteBubble && this.emoteBubble.active) {
            this.emoteBubble.setPosition(this.x, this.y - r * 2.2 + bobY);
        }

        // Depth sort: higher y = higher depth
        const depth = DEPTH_AVATAR_BASE + this.y * 0.1;
        this.pinkFloorGlow.setDepth(depth - 6);
        this.aura.setDepth(depth - 2);
        this.sprite.setDepth(depth);
        this.nameTag.setDepth(depth + 4);
        this.shadow.setDepth(depth - 5);

        if (this.emoteBubble && this.emoteBubble.active) {
            this.emoteBubble.setDepth(depth + 10);
        }
    }

    destroy(): void {
        this.shadow.destroy();
        this.pinkFloorGlow.destroy();
        this.aura.destroy();
        this.sprite.destroy();
        this.nameTag.destroy();
        if (this.emoteBubble) {
            this.emoteBubble.destroy();
            this.emoteBubble = null;
        }
    }

    playEmote(emoji: string): void {
        if (this.emoteBubble) {
            this.emoteBubble.destroy();
        }

        const r = AVATAR_SIZE;
        const bx = this.x;
        const by = this.y - r * 2.2;

        // Visual speech bubble graphics
        const bubbleGfx = this.scene.add.graphics();
        const bw = 36;
        const bh = 36;
        const br = 8;
        bubbleGfx.fillStyle(0xffffff, 0.95);
        bubbleGfx.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, br);
        // Draw downward indicator triangle
        bubbleGfx.fillTriangle(0, bh / 2 + 5, -5, bh / 2 - 2, 5, bh / 2 - 2);
        bubbleGfx.lineStyle(1.5, COL_TRIM, 0.85);
        bubbleGfx.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, br);

        const text = this.scene.add.text(0, -1, emoji, {
            fontSize: '20px',
        }).setOrigin(0.5);

        this.emoteBubble = this.scene.add.container(bx, by, [bubbleGfx, text]);
        this.emoteBubble.setScale(0);

        // Animate pop-up
        this.scene.tweens.add({
            targets: this.emoteBubble,
            scaleX: 1, scaleY: 1,
            y: by - 12,
            duration: 250,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Fade out and float away after a short delay
                this.scene.tweens.add({
                    targets: this.emoteBubble,
                    alpha: 0,
                    y: by - 26,
                    delay: 1300,
                    duration: 350,
                    onComplete: () => {
                        if (this.emoteBubble) {
                            this.emoteBubble.destroy();
                            this.emoteBubble = null;
                        }
                    }
                });
            }
        });
    }

    private emitTrailParticle(): void {
        const g = this.scene.add.graphics();
        g.setDepth(DEPTH_SHADOW - 1);
        g.fillStyle(COL_TRIM, 0.5);
        g.fillCircle(this.x, this.y + AVATAR_SIZE * 0.5, 2.5);
        this.scene.tweens.add({
            targets:  g,
            alpha:    0,
            scaleX:   0.2,
            scaleY:   0.2,
            duration: 400,
            ease:     'Sine.easeOut',
            onComplete: () => { g.destroy(); },
        });
    }
}

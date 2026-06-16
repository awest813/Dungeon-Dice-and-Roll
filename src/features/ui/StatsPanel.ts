import Phaser from 'phaser';
import { Panel } from './Panel';
import { GameState } from '../../core/state/GameState';
import {
    COL_UI_BG3, COL_UI_BORDER,
    COL_NEON_BLUE, FONT
} from '../../game/constants';
import { SoundManager } from '../../core/systems/SoundManager';
import { ToastManager } from './ToastManager';

interface Achievement {
    name: string;
    desc: string;
    emoji: string;
    check: (state: any) => boolean;
    reward: number;
}

const ACHIEVEMENTS: Achievement[] = [
    { name: 'High Roller', desc: 'Accumulate 10,000 chips', emoji: '💰', check: (s) => s.chips >= 10000, reward: 2500 },
    { name: 'Slots Legend', desc: 'Single Slots win >= 1,000', emoji: '💎', check: (s) => s.stats.slotsMaxWin >= 1000, reward: 1500 },
    { name: 'Poker Shark', desc: 'Win 5 hands of Texas Hold\'em', emoji: '🦈', check: (s) => s.stats.pokerHandsWon >= 5, reward: 2000 },
    { name: 'Lucky Shot', desc: 'Claim bartender\'s lucky bonus', emoji: '🥃', check: (s) => s.stats.barLuckyShotsClaimed > 0, reward: 500 },
    { name: 'Blackjack Pro', desc: 'Get a Natural Blackjack (21)', emoji: '🃏', check: (s) => s.stats.bjBlackjacks > 0, reward: 1000 },
    { name: 'Plinko Wizard', desc: 'Single Plinko win >= 250', emoji: '🌀', check: (s) => s.stats.plinkoMaxWin >= 250, reward: 1000 },
    { name: 'Bingo Master', desc: 'Win 3 cards of Bingo', emoji: '🎱', check: (s) => s.stats.bingoCardsWon >= 3, reward: 1500 },
    { name: 'Double Down', desc: 'Double down in Blackjack', emoji: '⚡', check: (s) => s.stats.bjDoubleDowns > 0, reward: 500 },
    { name: 'Thirsty Guest', desc: 'Order 5 drinks at the bar', emoji: '🍹', check: (s) => s.stats.barDrinksOrdered >= 5, reward: 500 },
    { name: 'Trifecta', desc: 'Win 3 horse race bets', emoji: '🏇', check: (s) => s.stats.horseRacesWon >= 3, reward: 2000 },
];

interface GuideEntry {
    name: string;
    emoji: string;
    rules: string;
}

const GUIDE_ENTRIES: Record<string, GuideEntry> = {
    slots: {
        name: 'Slots Corner',
        emoji: '🎰',
        rules: '• 3-reel classic slot machine.\n• Select your bet (10, 25, 50, 100◈) and press SPIN or SPACE.\n• 3-of-a-kind pays:\n  7️⃣ = 50x  |  💎 = 20x  |  ⭐ = 10x\n  🍇 = 6x  |  🍊 = 4x  |  🍋 = 3x  |  🍒 = 2x\n• Pair of Cherries pays a 1x consolation.\n• (VIP Slot machine bets: 100, 250, 500, 1000◈).'
    },
    poker: {
        name: 'Poker Room',
        emoji: '♠',
        rules: '• Heads-up Texas Hold\'em against smart AI.\n• Buy-in is 500◈. Blinds: 10/20◈.\n• Post blinds, get 2 hole cards.\n• Betting rounds: Pre-flop, Flop, Turn, River.\n• Actions: Fold, Check, Call, Raise.\n• Best 5-card poker hand wins the pot.\n• AI auto-rebuys if they run out of chips.'
    },
    blackjack: {
        name: 'Blackjack',
        emoji: '🃏',
        rules: '• Classic Blackjack against the dealer.\n• Get your hand value closer to 21 than dealer without busting.\n• Options: Hit (H), Stand (S), Double Down (D), or Split Pairs (✂).\n• Dealer must hit soft 17.\n• Natural Blackjack pays 3:2.\n• Splits double your bet and play two hands.'
    },
    plinko: {
        name: 'Plinko Board',
        emoji: '🎯',
        rules: '• Drop balls down a triangular peg board.\n• Choose your bet and Risk Level (Low, Med, High).\n• Low risk: Safe payouts, lower maximum.\n• High risk: Hits outer slots for massive multipliers (up to 28x), but center slots pay 0.2x.\n• Press SPACE or click DROP to play.'
    },
    roulette: {
        name: 'Roulette',
        emoji: '🎡',
        rules: '• Premium single-zero layout.\n• Drag chips onto numbers, lines, colors (Red/Black), or ranges (1-18/19-36).\n• Click SPIN to spin the wheel.\n• Payouts:\n  Single number: 35:1\n  Split (2 numbers): 17:1\n  Red/Black/Even/Odd: 1:1'
    },
    bingo: {
        name: 'Bingo Hall',
        emoji: '🎱',
        rules: '• Classic 75-ball bingo cards.\n• Buy cards (25◈ each). Numbers are called every 2 seconds.\n• Complete any full line (Horizontal, Vertical, or Diagonal) to yell BINGO!\n• Turn on Auto-play to let the caller run automatically.\n• Faster bingo rounds = higher multipliers!'
    },
    horses: {
        name: 'Horse Racing',
        emoji: '🏇',
        rules: '• 4-horse simulation race.\n• Pick a horse to win and set your wager.\n• Horse odds vary (e.g. 2:1 favorite, 8:1 underdog).\n• Watch the live track and cheer on your runner!\n• Returns wager x odds on victory.'
    },
    bar: {
        name: 'Bar & Lounge',
        emoji: '🍹',
        rules: '• Order signature drinks from the menu.\n• "Today\'s Special" is selected randomly at 50% off.\n• Tipping the bartender is optional but appreciated!\n• Claim "Lucky Shot" (bonus chips) once per session!'
    },
    vip: {
        name: 'VIP Lounge',
        emoji: '👑',
        rules: '• High-Stakes room for elite players.\n• Requires 15,000◈ or more to enter.\n• Features the VIP Golden Slot machine (10x wagers: 100, 250, 500, 1000◈).\n• Exclusive stanchion barrier and elegant stanchion-buster NPCs.'
    }
};

export class StatsPanel extends Panel {
    private activeTab: 'stats' | 'achievements' | 'guide' | 'wardrobe' = 'stats';
    private tabBtns: Array<{ rect: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text; key: 'stats' | 'achievements' | 'guide' | 'wardrobe' }> = [];
    private tabObjects: Phaser.GameObjects.GameObject[] = [];
    private activeGuideGame = 'slots';
    private guideObjects: Phaser.GameObjects.GameObject[] = [];
    private onClose: () => void;

    constructor(scene: Phaser.Scene, onClose: () => void) {
        super(scene, 580, 480);
        this.onClose = onClose;
        this.addTitle('📋 PROFILE & PORTFOLIO');
        this.buildTabs();
        this.showTab('stats');
        this.addCloseButton(() => {
            this.destroy();
            this.onClose();
        });
    }

    private buildTabs(): void {
        const tabY = -158;
        const tabW = 130;
        const tabH = 32;
        const tabNames: Array<{ key: 'stats' | 'achievements' | 'guide' | 'wardrobe'; label: string }> = [
            { key: 'stats', label: '📊 Stats' },
            { key: 'achievements', label: '🏆 Trophies' },
            { key: 'wardrobe', label: '👔 Wardrobe' },
            { key: 'guide', label: '📖 Guide' },
        ];

        tabNames.forEach((t, i) => {
            const tx = -210 + i * 140;

            const rect = this.scene.add.rectangle(tx, tabY, tabW, tabH, 0x141a29, 0.9)
                .setStrokeStyle(1, 0x445566, 0.6)
                .setInteractive({ useHandCursor: true });

            const text = this.scene.add.text(tx, tabY, t.label, {
                fontFamily: FONT, fontSize: '13px', color: '#889090', fontStyle: 'bold'
            }).setOrigin(0.5);

            rect.on('pointerover', () => {
                if (this.activeTab !== t.key) {
                    rect.setFillStyle(0x1e2638);
                    text.setColor('#ffffff');
                }
            });

            rect.on('pointerout', () => {
                if (this.activeTab !== t.key) {
                    rect.setFillStyle(0x141a29);
                    text.setColor('#889090');
                }
            });

            rect.on('pointerdown', () => {
                SoundManager.playClick();
                this.showTab(t.key);
            });

            this.tabBtns.push({ rect, text, key: t.key });
            this.container.add([rect, text]);
        });
    }

    private showTab(key: 'stats' | 'achievements' | 'guide' | 'wardrobe'): void {
        this.activeTab = key;

        this.tabBtns.forEach(btn => {
            if (btn.key === key) {
                btn.rect.setFillStyle(COL_NEON_BLUE, 0.18);
                btn.rect.setStrokeStyle(1.5, COL_UI_BORDER, 0.9);
                btn.text.setColor('#f0e6d3');
            } else {
                btn.rect.setFillStyle(0x141a29, 0.9);
                btn.rect.setStrokeStyle(1, 0x445566, 0.6);
                btn.text.setColor('#889090');
            }
        });

        this.clearTabObjects();

        if (key === 'stats') {
            this.renderStatsTab();
        } else if (key === 'achievements') {
            this.renderAchievementsTab();
        } else if (key === 'wardrobe') {
            this.renderWardrobeTab();
        } else if (key === 'guide') {
            this.renderGuideTab();
        }
    }

    private clearTabObjects(): void {
        this.tabObjects.forEach(obj => obj.destroy());
        this.tabObjects = [];
        this.guideObjects = [];
    }

    private renderStatsTab(): void {
        const s = GameState.get();
        const st = s.stats;

        // Profile Banner card
        const profileBg = this.scene.add.graphics();
        profileBg.fillStyle(COL_UI_BG3, 0.8);
        profileBg.fillRoundedRect(-262, -132, 524, 26, 4);
        profileBg.lineStyle(1, COL_UI_BORDER, 0.35);
        profileBg.strokeRoundedRect(-262, -132, 524, 26, 4);

        const netPL = s.chips - 1000;
        const netStr = `${netPL >= 0 ? '+' : ''}${netPL.toLocaleString()}◈`;
        const profileText = this.scene.add.text(-250, -125, `👤 Guest  ·  Chips: ${s.chips.toLocaleString()}◈  ·  Session P&L: ${netStr}`, {
            fontFamily: FONT, fontSize: '11px', color: netPL >= 0 ? '#2ecc71' : '#e74c3c', fontStyle: 'bold'
        });

        this.container.add([profileBg, profileText]);
        this.tabObjects.push(profileBg, profileText);

        const colW = 256;
        const colH = 58;
        const c1X = -136;
        const c2X = 136;

        // Slots
        const slotsLines = [
            `Spins: ${st.slotsSpins}  ·  Max Win: ${st.slotsMaxWin.toLocaleString()}◈`,
            `Wagered: ${st.slotsWagered.toLocaleString()}◈  ·  Won: ${st.slotsWon.toLocaleString()}◈`,
        ];
        this.renderCard(c1X, -98, colW, colH, 'Slots', '🎰', slotsLines);

        // Plinko
        const plinkoLines = [
            `Drops: ${st.plinkoDrops}  ·  Max Win: ${st.plinkoMaxWin.toLocaleString()}◈`,
            `Wagered: ${st.plinkoWagered.toLocaleString()}◈  ·  Won: ${st.plinkoWon.toLocaleString()}◈`,
        ];
        this.renderCard(c1X, -32, colW, colH, 'Plinko', '🎯', plinkoLines);

        // Roulette
        const rouletteLines = [
            `Spins: ${st.rouletteSpins}  ·  Max Win: ${st.rouletteMaxWin.toLocaleString()}◈`,
            `Wagered: ${st.rouletteWagered.toLocaleString()}◈  ·  Won: ${st.rouletteWon.toLocaleString()}◈`,
        ];
        this.renderCard(c1X, 34, colW, colH, 'Roulette', '🎡', rouletteLines);

        // Horses
        const horseLines = [
            `Races: ${st.horseRacesBet}  ·  Won: ${st.horseRacesWon}`,
            `Wagered: ${st.horseWagered.toLocaleString()}◈  ·  Won: ${st.horseWon.toLocaleString()}◈`,
        ];
        this.renderCard(c1X, 100, colW, colH, 'Horse Racing', '🏇', horseLines);

        // Poker
        const pokerLines = [
            `Hands: ${st.pokerHandsPlayed}  ·  Won: ${st.pokerHandsWon}`,
            `Wagered: ${st.pokerWagered.toLocaleString()}◈  ·  Won: ${st.pokerWon.toLocaleString()}◈`,
        ];
        this.renderCard(c2X, -98, colW, colH, 'Poker', '♠', pokerLines);

        // Blackjack
        const bjLines = [
            `Hands: ${st.bjHandsPlayed}  ·  W/L/T: ${st.bjHandsWon}/${st.bjHandsLosses}/${st.bjHandsTied}`,
            `Wagered: ${st.bjWagered.toLocaleString()}◈  ·  Won: ${st.bjWon.toLocaleString()}◈`,
        ];
        this.renderCard(c2X, -32, colW, colH, 'Blackjack', '🃏', bjLines);

        // Bingo
        const bingoLines = [
            `Cards: ${st.bingoCardsPlayed}  ·  Won: ${st.bingoCardsWon}`,
            `Wagered: ${st.bingoWagered.toLocaleString()}◈  ·  Won: ${st.bingoWon.toLocaleString()}◈`,
        ];
        this.renderCard(c2X, 34, colW, colH, 'Bingo', '🎱', bingoLines);

        // Bar
        const barLines = [
            `Drinks Ordered: ${st.barDrinksOrdered}`,
            `Tipped: ${st.barChipsTipped.toLocaleString()}◈  ·  Bonuses: ${st.barLuckyShotsClaimed}`,
        ];
        this.renderCard(c2X, 100, colW, colH, 'Bar', '🍹', barLines);
    }

    private renderCard(
        x: number,
        y: number,
        w: number,
        h: number,
        title: string,
        emoji: string,
        lines: string[]
    ): void {
        const g = this.scene.add.graphics();
        g.fillStyle(0x000000, 0.25);
        g.fillRoundedRect(x - w / 2 + 2, y + 2, w, h, 6);
        g.fillStyle(0x0a1424, 0.82);
        g.fillRoundedRect(x - w / 2, y, w, h, 6);
        g.lineStyle(1, 0x3a4a68, 0.45);
        g.strokeRoundedRect(x - w / 2, y, w, h, 6);

        const titleText = this.scene.add.text(x - w / 2 + 10, y + 6, `${emoji}  ${title}`, {
            fontFamily: FONT, fontSize: '11px', color: '#c9a84c', fontStyle: 'bold'
        });

        const listObjects: Phaser.GameObjects.GameObject[] = [g, titleText];

        lines.forEach((l, idx) => {
            const lineText = this.scene.add.text(x - w / 2 + 10, y + 24 + idx * 14, l, {
                fontFamily: FONT, fontSize: '10px', color: '#cbd5e1'
            });
            listObjects.push(lineText);
        });

        listObjects.forEach(obj => {
            this.container.add(obj);
            this.tabObjects.push(obj);
        });
    }

    private renderAchievementsTab(): void {
        const s = GameState.get();

        const colW = 256;
        const colH = 48;
        const c1X = -136;
        const c2X = 136;

        ACHIEVEMENTS.forEach((ach, i) => {
            const col = i % 2 === 0 ? c1X : c2X;
            const rowIdx = Math.floor(i / 2);
            const rowY = -120 + rowIdx * 56;

            const unlocked = ach.check(s);
            this.renderAchievement(col, rowY, colW, colH, ach, unlocked);
        });
    }

    private renderAchievement(
        x: number,
        y: number,
        w: number,
        h: number,
        ach: Achievement,
        unlocked: boolean
    ): void {
        const g = this.scene.add.graphics();
        g.fillStyle(unlocked ? 0x071e12 : 0x0b101c, 0.85);
        g.fillRoundedRect(x - w / 2, y, w, h, 6);
        g.lineStyle(1.5, unlocked ? 0x27ae60 : 0x313d4f, unlocked ? 0.8 : 0.4);
        g.strokeRoundedRect(x - w / 2, y, w, h, 6);

        const emojiText = this.scene.add.text(x - w / 2 + 12, y + h / 2, unlocked ? ach.emoji : '🔒', {
            fontFamily: FONT, fontSize: '16px'
        }).setOrigin(0, 0.5);

        const titleText = this.scene.add.text(x - w / 2 + 40, y + 6, ach.name, {
            fontFamily: FONT, fontSize: '11px', color: unlocked ? '#2ecc71' : '#7f8c8d', fontStyle: 'bold'
        });

        const descText = this.scene.add.text(x - w / 2 + 40, y + 22, ach.desc, {
            fontFamily: FONT, fontSize: '9px', color: unlocked ? '#cbd5e1' : '#64748b'
        });

        const listObjects: Phaser.GameObjects.GameObject[] = [g, emojiText, titleText, descText];

        const isClaimed = GameState.get().claimedAchievements.includes(ach.name);

        if (unlocked && !isClaimed) {
            const claimBtnHit = this.scene.add.rectangle(x + w / 2 - 40, y + h / 2, 70, 24, 0x000000, 0)
                .setInteractive({ useHandCursor: true });
            
            const claimBtnGfx = this.scene.add.graphics();
            claimBtnGfx.fillStyle(0x2ecc71, 1);
            claimBtnGfx.fillRoundedRect(x + w / 2 - 75, y + h / 2 - 12, 70, 24, 4);

            const claimBtnText = this.scene.add.text(x + w / 2 - 40, y + h / 2, `+${ach.reward}◈`, {
                fontFamily: FONT, fontSize: '10px', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0.5);

            claimBtnHit.on('pointerdown', () => {
                SoundManager.playClick();
                GameState.claimAchievement(ach.name, ach.reward);
                // Re-render tab to update UI to claimed state
                this.clearTabObjects();
                this.renderAchievementsTab();
            });

            listObjects.push(claimBtnHit, claimBtnGfx, claimBtnText);
        } else if (isClaimed) {
            const claimedText = this.scene.add.text(x + w / 2 - 40, y + h / 2, `CLAIMED`, {
                fontFamily: FONT, fontSize: '10px', color: '#27ae60', fontStyle: 'bold'
            }).setOrigin(0.5);
            listObjects.push(claimedText);
        }

        listObjects.forEach(obj => {
            this.container.add(obj);
            this.tabObjects.push(obj);
        });
    }

    private renderWardrobeTab(): void {
        const avatars = [
            { key: 'avatar_player', name: 'Classic Guest', desc: 'The original casino wanderer.', cost: 0 },
            { key: 'avatar_showgirl', name: 'Showgirl', desc: 'A dazzling performer.', cost: 5000 },
            { key: 'avatar_ai_vip', name: 'High Roller', desc: 'Reserved for the VIP Lounge.', cost: 25000 }
        ];

        const cardW = 160;
        const cardH = 220;
        const startX = -180;
        const y = -10;

        avatars.forEach((av, i) => {
            const x = startX + i * 180;

            const state = GameState.get();
            const isUnlocked = state.unlockedAvatars.includes(av.key);
            const isSelected = state.avatarTextureKey === av.key;

            const g = this.scene.add.graphics();
            g.fillStyle(isSelected ? 0x1a2538 : (isUnlocked ? 0x0a1424 : 0x050a12), 0.85);
            g.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 6);
            g.lineStyle(isSelected ? 2 : 1.5, isSelected ? COL_NEON_BLUE : COL_UI_BORDER, 0.8);
            g.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 6);

            const sprite = this.scene.add.image(x, y - 20, av.key);
            sprite.setDisplaySize(75, 110);
            if (!isUnlocked) {
                sprite.setTint(0x444444); // Darken locked avatars
            }
            
            const title = this.scene.add.text(x, y + 60, av.name, {
                fontFamily: FONT, fontSize: '13px', color: isSelected ? '#ffffff' : (isUnlocked ? '#c9a84c' : '#777777'), fontStyle: 'bold'
            }).setOrigin(0.5);

            const desc = this.scene.add.text(x, y + 80, av.desc, {
                fontFamily: FONT, fontSize: '10px', color: isUnlocked ? '#cbd5e1' : '#555555', align: 'center', wordWrap: { width: cardW - 20 }
            }).setOrigin(0.5);

            const objs: Phaser.GameObjects.GameObject[] = [g, sprite, title, desc];

            if (isUnlocked) {
                const hitArea = this.scene.add.rectangle(x, y, cardW, cardH, 0x000000, 0)
                    .setInteractive({ useHandCursor: true });

                hitArea.on('pointerdown', () => {
                    SoundManager.playClick();
                    GameState.update({ avatarTextureKey: av.key });
                    this.showTab('wardrobe'); // Re-render to show selection
                });
                objs.push(hitArea);
            } else {
                // Buy Button
                const canAfford = state.chips >= av.cost;
                const buyBtnHit = this.scene.add.rectangle(x, y + 120, 80, 26, 0x000000, 0)
                    .setInteractive({ useHandCursor: canAfford });
                
                const buyBtnGfx = this.scene.add.graphics();
                buyBtnGfx.fillStyle(canAfford ? 0x2ecc71 : 0x555555, 1);
                buyBtnGfx.fillRoundedRect(x - 40, y + 107, 80, 26, 4);

                const buyBtnText = this.scene.add.text(x, y + 120, `BUY (${av.cost}◈)`, {
                    fontFamily: FONT, fontSize: '11px', color: canAfford ? '#ffffff' : '#aaaaaa', fontStyle: 'bold'
                }).setOrigin(0.5);

                if (canAfford) {
                    buyBtnHit.on('pointerdown', () => {
                        SoundManager.playClick();
                        GameState.addChips(-av.cost);
                        GameState.unlockAvatar(av.key);
                        ToastManager.show(this.scene, `Unlocked ${av.name}!`, 'win');
                        this.showTab('wardrobe'); // Re-render
                    });
                }
                objs.push(buyBtnHit, buyBtnGfx, buyBtnText);
            }

            objs.forEach(o => {
                this.container.add(o);
                this.tabObjects.push(o);
            });
        });
    }

    private renderGuideTab(): void {
        const btnW = 150;
        const btnH = 26;
        const keys = ['slots', 'poker', 'blackjack', 'roulette', 'plinko', 'bingo', 'horses', 'bar', 'vip'];

        const cardX = 76;
        const cardY = -120;
        const cardW = 328;
        const cardH = 282;

        const bgGfx = this.scene.add.graphics();
        bgGfx.fillStyle(0x0a1424, 0.85);
        bgGfx.fillRoundedRect(cardX - cardW / 2, cardY, cardW, cardH, 6);
        bgGfx.lineStyle(1.5, COL_UI_BORDER, 0.65);
        bgGfx.strokeRoundedRect(cardX - cardW / 2, cardY, cardW, cardH, 6);

        this.container.add(bgGfx);
        this.tabObjects.push(bgGfx);

        this.guideObjects = [];

        const updateGuideContent = (key: string) => {
            this.activeGuideGame = key;

            this.guideObjects.forEach(obj => obj.destroy());
            this.guideObjects = [];

            const entry = GUIDE_ENTRIES[key];
            if (!entry) return;

            const title = this.scene.add.text(cardX - cardW / 2 + 16, cardY + 14, `${entry.emoji}  ${entry.name.toUpperCase()}`, {
                fontFamily: FONT, fontSize: '12px', color: '#c9a84c', fontStyle: 'bold'
            });

            const line = this.scene.add.graphics();
            line.lineStyle(1, 0x3a4a68, 0.5);
            line.lineBetween(cardX - cardW / 2 + 16, cardY + 32, cardX + cardW / 2 - 16, cardY + 32);

            const rules = this.scene.add.text(cardX - cardW / 2 + 16, cardY + 42, entry.rules, {
                fontFamily: FONT, fontSize: '10.5px', color: '#e2e8f0', lineSpacing: 4,
                wordWrap: { width: cardW - 32 }
            });

            const objs = [title, line, rules];
            objs.forEach(o => {
                this.container.add(o);
                this.tabObjects.push(o);
                this.guideObjects.push(o);
            });

            drawSelectors();
        };

        const selectorBtns: Array<{ rect: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text; key: string }> = [];

        const drawSelectors = () => {
            keys.forEach((key, i) => {
                const btn = selectorBtns[i];
                const active = this.activeGuideGame === key;
                if (active) {
                    btn.rect.setFillStyle(COL_NEON_BLUE, 0.15);
                    btn.rect.setStrokeStyle(1.5, COL_UI_BORDER, 0.85);
                    btn.text.setColor('#f0e6d3');
                } else {
                    btn.rect.setFillStyle(0x101726, 0.9);
                    btn.rect.setStrokeStyle(1, 0x3a4a68, 0.4);
                    btn.text.setColor('#889090');
                }
            });
        };

        keys.forEach((key, i) => {
            const by = -120 + i * 30 + btnH / 2;
            const bx = -190;

            const rect = this.scene.add.rectangle(bx, by, btnW, btnH, 0x101726, 0.9)
                .setStrokeStyle(1, 0x3a4a68, 0.4)
                .setInteractive({ useHandCursor: true });

            const entry = GUIDE_ENTRIES[key];
            const text = this.scene.add.text(bx, by, `${entry.emoji}  ${entry.name}`, {
                fontFamily: FONT, fontSize: '11px', color: '#889090'
            }).setOrigin(0.5);

            rect.on('pointerover', () => {
                if (this.activeGuideGame !== key) {
                    rect.setFillStyle(0x1e2638);
                    text.setColor('#ffffff');
                }
            });

            rect.on('pointerout', () => {
                if (this.activeGuideGame !== key) {
                    rect.setFillStyle(0x101726);
                    text.setColor('#889090');
                }
            });

            rect.on('pointerdown', () => {
                SoundManager.playClick();
                updateGuideContent(key);
            });

            selectorBtns.push({ rect, text, key });
            this.container.add([rect, text]);
            this.tabObjects.push(rect, text);
        });

        updateGuideContent(this.activeGuideGame);
    }
}

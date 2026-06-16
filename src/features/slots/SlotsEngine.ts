// ── Slots game engine — pure logic, no Phaser dependency ──────────────────────
// Generates random slot results based on weighted probabilities and evaluates payouts.

import { GameState } from '../../core/state/GameState';

export const SYMBOLS  = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '7️⃣', '🎰'];
export const WEIGHTS  = [30, 25, 20, 12, 7, 4, 2, 5];  // weighted rarity (lower = rarer)

// Payout multipliers for matching symbols (3-of-a-kind)
export const PAYOUTS: Record<string, number> = {
    '🍒': 2, '🍋': 3, '🍊': 4, '🍇': 6, '⭐': 10, '💎': 20, '7️⃣': 50,
};
export const CHERRY_PAIR_PAYOUT = 1;   // Two cherries = small consolation

export function weightedRandom(): string {
    let w = [...WEIGHTS];
    if (GameState.hasBuff('slotsLuck')) {
        w[4] *= 2; w[5] *= 3; w[6] *= 5; w[7] *= 3;
    }
    const total = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < SYMBOLS.length; i++) {
        r -= w[i];
        if (r <= 0) return SYMBOLS[i];
    }
    return SYMBOLS[0];
}

export interface SpinResult {
    reels: string[];
    payout: number;
    scatters: number;
    addedSpins: number;
    isJackpot: boolean;
    isWin: boolean;
    isCherryPair: boolean;
    nearMissSymbol: string | null;
}

export function evaluateSpin(reels: string[], bet: number, isFreeSpin: boolean): SpinResult {
    const [a, b, c] = reels;
    let payout = 0;
    let jackpot = false;
    let scatters = 0;
    let addedSpins = 0;
    let isCherryPair = false;
    let nearMissSymbol: string | null = null;

    if (a === '🎰') scatters++;
    if (b === '🎰') scatters++;
    if (c === '🎰') scatters++;

    const multiplier = isFreeSpin ? 2 : 1;

    if (scatters >= 2) {
        addedSpins = scatters === 3 ? 15 : 5;
    }

    // ── Three of a kind ───────────────────────────────────────────────────
    if (a === b && b === c && a !== '🎰') {
        const mult = PAYOUTS[a] ?? 2;
        payout  = bet * mult * multiplier;
        jackpot = a === '7️⃣';
    } else if (a === b || b === c || a === c) {
        // ── Two of a kind ─────────────────────────────────────────────────
        isCherryPair = (a === b && a === '🍒') || (b === c && b === '🍒') || (a === c && a === '🍒');
        
        if (isCherryPair) {
            payout = bet * CHERRY_PAIR_PAYOUT * multiplier;
        } else if (scatters < 2) {
            // Near-miss: two premium symbols
            const matchPair = a === b ? a : b === c ? b : a === c ? a : null;
            const premiumMatch = matchPair !== null && matchPair !== '🎰' && (PAYOUTS[matchPair] ?? 0) >= 6;
            if (premiumMatch) {
                nearMissSymbol = matchPair;
            }
        }
    }

    return {
        reels,
        payout,
        scatters,
        addedSpins,
        isJackpot: jackpot,
        isWin: payout > 0,
        isCherryPair,
        nearMissSymbol
    };
}

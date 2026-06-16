// ── Plinko game engine — pure logic, no Phaser dependency ────────────────────
// A ball drops through a peg board, landing in one of the slots at the bottom.
// Payout is determined by the slot multiplier and the risk level.

export type RiskLevel = 'low' | 'medium' | 'high';

export const RISK_MULTIPLIERS: Record<RiskLevel, number[]> = {
    low:    [0.4, 0.5, 0.7, 1.0, 1.5, 3.0, 1.5, 1.0, 0.7, 0.5, 0.4],
    medium: [0.2, 0.5, 1.0, 2.0, 5.0, 10,  5.0, 2.0, 1.0, 0.5, 0.2],
    high:   [0,   0,   0.2, 0.5, 2.0, 50,  2.0, 0.5, 0.2, 0,   0  ],
};

export const SLOT_COUNT = RISK_MULTIPLIERS.medium.length;
export const BOARD_ROWS = 8;

export const BET_OPTIONS = [10, 25, 50, 100] as const;

export interface DropResult {
    path: number[];     // column position at each row (0 = top, BOARD_ROWS = bottom)
    finalSlot: number;  // index of the slot the ball lands in
    multiplier: number; // payout multiplier based on risk level
    payout: number;     // total payout (bet * multiplier)
}

/**
 * Simulates a single Plinko drop.
 * Returns the path taken and the final slot.
 */
export function simulateDrop(bet: number, riskLevel: RiskLevel): DropResult {
    const path: number[] = [];
    let colPos = (SLOT_COUNT - 1) / 2;

    path.push(colPos); // Initial position

    for (let row = 0; row < BOARD_ROWS; row++) {
        // Ball hits a peg and deflects left (-0.5) or right (+0.5)
        const deflect = Math.random() < 0.5 ? -0.5 : 0.5;
        
        // Ensure colPos stays within bounds
        let nextPos = colPos + deflect;
        if (nextPos < 0) nextPos = 0;
        if (nextPos > SLOT_COUNT - 1) nextPos = SLOT_COUNT - 1;
        
        colPos = nextPos;
        path.push(colPos);
    }

    let finalSlot = Math.round(colPos);
    if (finalSlot < 0) finalSlot = 0;
    if (finalSlot > SLOT_COUNT - 1) finalSlot = SLOT_COUNT - 1;

    const multiplier = RISK_MULTIPLIERS[riskLevel][finalSlot];
    const payout = Math.round(bet * multiplier);

    return {
        path,
        finalSlot,
        multiplier,
        payout
    };
}

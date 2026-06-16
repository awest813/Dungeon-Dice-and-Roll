import { evaluateSpin, PAYOUTS, CHERRY_PAIR_PAYOUT } from './SlotsEngine';

describe('SlotsEngine', () => {
    it('evaluates three of a kind correctly', () => {
        const result = evaluateSpin(['🍒', '🍒', '🍒'], 100, false);
        expect(result.isWin).toBe(true);
        expect(result.isJackpot).toBe(false);
        expect(result.payout).toBe(100 * PAYOUTS['🍒']);
    });

    it('evaluates jackpot correctly', () => {
        const result = evaluateSpin(['7️⃣', '7️⃣', '7️⃣'], 10, false);
        expect(result.isWin).toBe(true);
        expect(result.isJackpot).toBe(true);
        expect(result.payout).toBe(10 * PAYOUTS['7️⃣']);
    });

    it('evaluates cherry pair correctly', () => {
        const result1 = evaluateSpin(['🍒', '🍒', '🍋'], 50, false);
        expect(result1.isWin).toBe(true);
        expect(result1.isCherryPair).toBe(true);
        expect(result1.payout).toBe(50 * CHERRY_PAIR_PAYOUT);

        const result2 = evaluateSpin(['🍋', '🍒', '🍒'], 50, false);
        expect(result2.isCherryPair).toBe(true);

        const result3 = evaluateSpin(['🍒', '🍋', '🍒'], 50, false);
        expect(result3.isCherryPair).toBe(true);
    });

    it('detects near misses correctly', () => {
        const result = evaluateSpin(['7️⃣', '7️⃣', '🍋'], 10, false);
        expect(result.isWin).toBe(false);
        expect(result.nearMissSymbol).toBe('7️⃣');
        expect(result.payout).toBe(0);
    });

    it('handles scatters correctly', () => {
        const result1 = evaluateSpin(['🎰', '🎰', '🍋'], 10, false);
        expect(result1.scatters).toBe(2);
        expect(result1.addedSpins).toBe(5);

        const result2 = evaluateSpin(['🎰', '🎰', '🎰'], 10, false);
        expect(result2.scatters).toBe(3);
        expect(result2.addedSpins).toBe(15);
    });

    it('handles free spin multipliers', () => {
        const result = evaluateSpin(['🍒', '🍒', '🍒'], 10, true); // free spin
        expect(result.payout).toBe(10 * PAYOUTS['🍒'] * 2); // 2x multiplier
    });
});

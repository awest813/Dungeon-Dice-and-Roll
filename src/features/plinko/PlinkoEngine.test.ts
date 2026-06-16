import { simulateDrop, RISK_MULTIPLIERS } from './PlinkoEngine';

describe('PlinkoEngine', () => {
    it('returns a valid drop result', () => {
        const bet = 100;
        const result = simulateDrop(bet, 'medium');

        expect(result.path.length).toBe(9); // initial pos + 8 rows
        expect(result.finalSlot).toBeGreaterThanOrEqual(0);
        expect(result.finalSlot).toBeLessThanOrEqual(10);
        
        expect(result.multiplier).toBe(RISK_MULTIPLIERS.medium[result.finalSlot]);
        expect(result.payout).toBe(Math.round(bet * result.multiplier));
    });

    it('uses the correct risk multipliers', () => {
        const bet = 10;
        const lowResult = simulateDrop(bet, 'low');
        expect(lowResult.multiplier).toBe(RISK_MULTIPLIERS.low[lowResult.finalSlot]);

        const highResult = simulateDrop(bet, 'high');
        expect(highResult.multiplier).toBe(RISK_MULTIPLIERS.high[highResult.finalSlot]);
    });
});

import { createRace, resolveRace, chipDelta, HORSES } from './HorseRaceEngine';

describe('HorseRaceEngine', () => {
    it('creates a betting state correctly', () => {
        const bet = 50;
        const selectedHorse = 2;
        const state = createRace(bet, selectedHorse);

        expect(state.phase).toBe('betting');
        expect(state.bet).toBe(bet);
        expect(state.selectedHorse).toBe(selectedHorse);
        expect(state.winnerId).toBeNull();
    });

    it('resolves the race and determines a winner', () => {
        const state = createRace(100, 0);
        const resolved = resolveRace(state);

        expect(resolved.phase).toBe('result');
        expect(resolved.winnerId).not.toBeNull();
        expect(resolved.winnerId).toBeGreaterThanOrEqual(0);
        expect(resolved.winnerId).toBeLessThan(HORSES.length);
        expect(resolved.progress[resolved.winnerId!]).toBe(1);
    });

    it('calculates chipDelta for a win correctly', () => {
        const state = createRace(100, 0);
        // Force the winner to be horse 0
        state.phase = 'result';
        state.winnerId = 0;
        
        const delta = chipDelta(state);
        expect(delta).toBe(100 * HORSES[0].odds);
    });

    it('calculates chipDelta for a loss correctly', () => {
        const state = createRace(100, 0);
        // Force the winner to be horse 1 (different from selected 0)
        state.phase = 'result';
        state.winnerId = 1;
        
        const delta = chipDelta(state);
        expect(delta).toBe(0); // Lost the bet (already deducted upfront)
    });
});

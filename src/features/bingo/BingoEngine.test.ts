import { createGame, callBall, chipDelta } from './BingoEngine';

describe('BingoEngine', () => {
    it('creates a game with valid initial state', () => {
        const bet = 25;
        const state = createGame(bet);

        expect(state.bet).toBe(bet);
        expect(state.phase).toBe('playing');
        expect(state.winType).toBe('none');
        expect(state.ballPool.length).toBe(30);
        expect(state.marked[2][2]).toBe(true); // Free space is marked
    });

    it('handles blackout win', () => {
        let state = createGame(10);
        
        // Mock the card and force balls
        // Set all grid spaces to 1 for simplicity of testing
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (r !== 2 || c !== 2) state.card.grid[r][c] = 1;
            }
        }
        
        state.ballPool = [3, 2, 1]; // The last ball drawn will be 1
        
        let result = callBall(state);
        expect(result).not.toBeNull();
        if (result) {
            state = result.newState;
            expect(state.winType).toBe('blackout');
            expect(state.phase).toBe('won');
            expect(chipDelta(state)).toBe(10 * (20 - 1)); // 20x payout - bet
        }
    });
    
    it('handles line win', () => {
        let state = createGame(10);
        
        // Mock a single horizontal line win (top row)
        for (let c = 0; c < 5; c++) {
            state.card.grid[0][c] = 1;
        }
        
        state.ballPool = [1]; // Pop 1
        let result = callBall(state);
        
        expect(result).not.toBeNull();
        if (result) {
            state = result.newState;
            expect(state.winType).toBe('line');
            expect(state.phase).toBe('won');
            expect(chipDelta(state)).toBe(10 * (3 - 1)); // 3x payout - bet
        }
    });

    it('handles bust', () => {
        let state = createGame(10);
        state.ballPool = [99]; // draw a ball not on the card
        
        let result = callBall(state);
        expect(result).not.toBeNull();
        if (result) {
            state = result.newState;
            expect(state.phase).toBe('bust');
            expect(chipDelta(state)).toBe(-10); // Loss
        }
    });
});

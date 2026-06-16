import { evalBet, RouletteBet, getNumberColor } from './RouletteEngine';

describe('RouletteEngine', () => {
    it('evaluates straight bets correctly', () => {
        const bet: RouletteBet = { type: 'straight', number: 17, amount: 10 };
        
        expect(evalBet(bet, 17)).toBe(350); // Win 35x
        expect(evalBet(bet, 0)).toBe(-10);  // Lose
        expect(evalBet(bet, 16)).toBe(-10); // Lose
    });

    it('evaluates color bets correctly', () => {
        const redBet: RouletteBet = { type: 'red', amount: 20 };
        const blackBet: RouletteBet = { type: 'black', amount: 20 };
        
        // 1 is Red
        expect(getNumberColor(1)).toBe('red');
        expect(evalBet(redBet, 1)).toBe(20);
        expect(evalBet(blackBet, 1)).toBe(-20);

        // 2 is Black
        expect(getNumberColor(2)).toBe('black');
        expect(evalBet(redBet, 2)).toBe(-20);
        expect(evalBet(blackBet, 2)).toBe(20);

        // 0 is Green (loses both)
        expect(getNumberColor(0)).toBe('green');
        expect(evalBet(redBet, 0)).toBe(-20);
        expect(evalBet(blackBet, 0)).toBe(-20);
    });

    it('evaluates parity bets correctly', () => {
        const evenBet: RouletteBet = { type: 'even', amount: 15 };
        const oddBet: RouletteBet = { type: 'odd', amount: 15 };

        // 2 is even
        expect(evalBet(evenBet, 2)).toBe(15);
        expect(evalBet(oddBet, 2)).toBe(-15);

        // 3 is odd
        expect(evalBet(evenBet, 3)).toBe(-15);
        expect(evalBet(oddBet, 3)).toBe(15);

        // 0 loses parity bets
        expect(evalBet(evenBet, 0)).toBe(-15);
        expect(evalBet(oddBet, 0)).toBe(-15);
    });

    it('evaluates dozen/column bets correctly', () => {
        const dozen1: RouletteBet = { type: 'dozen1', amount: 10 }; // 1-12
        const col1: RouletteBet = { type: 'col1', amount: 10 };   // 1, 4, 7...
        
        expect(evalBet(dozen1, 5)).toBe(20); // 2:1 payout
        expect(evalBet(dozen1, 15)).toBe(-10);
        expect(evalBet(dozen1, 0)).toBe(-10);

        expect(evalBet(col1, 1)).toBe(20);
        expect(evalBet(col1, 4)).toBe(20);
        expect(evalBet(col1, 2)).toBe(-10);
        expect(evalBet(col1, 0)).toBe(-10);
    });
});

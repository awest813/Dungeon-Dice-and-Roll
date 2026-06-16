import { handValue, isBlackjack, isBust, isSoftHand, Card } from './BlackjackEngine';

describe('BlackjackEngine', () => {
    const ace: Card = { rank: 14, suit: 'H' };
    const king: Card = { rank: 13, suit: 'S' };
    const five: Card = { rank: 5, suit: 'D' };
    const six: Card = { rank: 6, suit: 'C' };

    it('calculates hand values correctly', () => {
        expect(handValue([king, five])).toBe(15);
        expect(handValue([ace, five])).toBe(16);
        expect(handValue([ace, ace, five])).toBe(17); // 11 + 1 + 5
        expect(handValue([king, six, five])).toBe(21);
        expect(handValue([king, six, five, ace])).toBe(22); // bust
    });

    it('detects blackjack', () => {
        expect(isBlackjack([ace, king])).toBe(true);
        expect(isBlackjack([king, ace])).toBe(true);
        expect(isBlackjack([ace, five])).toBe(false);
        expect(isBlackjack([king, five, six])).toBe(false); // 21 but 3 cards
    });

    it('detects bust', () => {
        expect(isBust([king, six, six])).toBe(true); // 22
        expect(isBust([king, six, five])).toBe(false); // 21
    });

    it('detects soft hands', () => {
        expect(isSoftHand([ace, five])).toBe(true); // Soft 16
        expect(isSoftHand([ace, king, five])).toBe(false); // Hard 16
        expect(isSoftHand([ace, ace, five])).toBe(true); // Soft 17
        expect(isSoftHand([king, five])).toBe(false);
    });
});

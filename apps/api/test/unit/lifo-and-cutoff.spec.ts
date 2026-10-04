import { describe, it, expect } from 'vitest';

describe('Logistics Math & Operational Invariants', () => {
  describe('LIFO Reverse Loading Sequence Calculation (BR-LOAD-001)', () => {
    it('should calculate stop sequence 1..N and loading sequence N..1', () => {
      const stops = ['Outlet-1 (First delivery)', 'Outlet-2', 'Outlet-3', 'Outlet-4 (Last delivery)'];
      const totalStops = stops.length;

      const sequencedStops = stops.map((name, index) => {
        const stopSequence = index + 1;
        const loadingSequence = totalStops - index;
        return { name, stopSequence, loadingSequence };
      });

      // First delivery stop is loaded LAST (loading sequence 4)
      expect(sequencedStops[0].stopSequence).toBe(1);
      expect(sequencedStops[0].loadingSequence).toBe(4);

      // Last delivery stop is loaded FIRST (loading sequence 1)
      expect(sequencedStops[3].stopSequence).toBe(4);
      expect(sequencedStops[3].loadingSequence).toBe(1);

      // Monotonic inverse relationship
      for (let i = 0; i < totalStops; i++) {
        expect(sequencedStops[i].stopSequence + sequencedStops[i].loadingSequence).toBe(totalStops + 1);
      }
    });
  });

  describe('Early Arrival Holding Time Calculation (BR-DELIV-002)', () => {
    function calculateWaitTime(arrivalTimeHHMM: string, windowStartHHMM: string): number {
      const [arrH, arrM] = arrivalTimeHHMM.split(':').map(Number);
      const [winH, winM] = windowStartHHMM.split(':').map(Number);

      const arrMinutes = arrH * 60 + arrM;
      const winMinutes = winH * 60 + winM;

      if (arrMinutes < winMinutes) {
        return winMinutes - arrMinutes;
      }
      return 0;
    }

    it('should compute exact waiting time when driver arrives before window opening', () => {
      // Arrives at 07:35, window opens at 08:00 -> 25 min wait
      const waitTime = calculateWaitTime('07:35', '08:00');
      expect(waitTime).toBe(25);
    });

    it('should compute zero wait time when driver arrives within or after window opening', () => {
      // Arrives at 08:15, window opened at 08:00 -> 0 min wait
      const waitTime = calculateWaitTime('08:15', '08:00');
      expect(waitTime).toBe(0);
    });
  });

  describe('Operational 16:00 Cutoff Classification (BR-ORD-001)', () => {
    function classifyOrderCutoff(hourColombo: number): { status: string; isCutoffLocked: boolean } {
      if (hourColombo >= 16) {
        return { status: 'QUEUED_NEXT_RUN', isCutoffLocked: true };
      }
      return { status: 'ORDER_RECORDED', isCutoffLocked: false };
    }

    it('should record order as ORDER_RECORDED when submitted at 14:00 (before 16:00)', () => {
      const outcome = classifyOrderCutoff(14);
      expect(outcome.status).toBe('ORDER_RECORDED');
      expect(outcome.isCutoffLocked).toBe(false);
    });

    it('should lock order into QUEUED_NEXT_RUN when submitted at 16:00 exactly', () => {
      const outcome = classifyOrderCutoff(16);
      expect(outcome.status).toBe('QUEUED_NEXT_RUN');
      expect(outcome.isCutoffLocked).toBe(true);
    });

    it('should lock order into QUEUED_NEXT_RUN when submitted at 17:30 (after 16:00)', () => {
      const outcome = classifyOrderCutoff(17);
      expect(outcome.status).toBe('QUEUED_NEXT_RUN');
      expect(outcome.isCutoffLocked).toBe(true);
    });
  });
});

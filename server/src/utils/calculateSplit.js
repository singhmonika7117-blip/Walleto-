const { SPLIT_TYPES } = require('../config/constants');

/**
 * Helper to round a number to two decimal places
 * @param {number} num
 * @returns {number}
 */
const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * Helper to convert monetary amount into integer cents to prevent floating point drift
 * @param {number} num
 * @returns {number}
 */
const toCents = (num) => Math.round((num + Number.EPSILON) * 100);

/**
 * Dynamic Expense Split Math Engine
 *
 * @param {Object} params
 * @param {number} params.totalAmount - Total cost of the expense
 * @param {string} params.splitType - 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES'
 * @param {Array} params.participants - Array of participant user IDs or split input objects:
 *    For EQUAL: ['userId1', 'userId2', ...] or [{ user: 'userId1' }, ...]
 *    For EXACT: [{ user: 'userId1', amount: 45.50 }, ...]
 *    For PERCENTAGE: [{ user: 'userId1', percentage: 50 }, ...]
 *    For SHARES: [{ user: 'userId1', shares: 2 }, ...]
 * @returns {Object} { totalAmount, splitType, splits: [{ user, amount, percentage, shares }] }
 */
function calculateSplit({ totalAmount, splitType = SPLIT_TYPES.EQUAL, participants = [] }) {
  const amount = round2(Number(totalAmount));

  if (isNaN(amount) || amount <= 0) {
    throw new Error('Total amount must be a positive number');
  }

  if (!Array.isArray(participants) || participants.length === 0) {
    throw new Error('At least one participant is required for splitting an expense');
  }

  const count = participants.length;
  const totalCents = toCents(amount);

  switch (splitType) {
    case SPLIT_TYPES.EQUAL: {
      const baseShareCents = Math.floor(totalCents / count);
      let remainderCents = totalCents % count;

      const splits = participants.map((p, idx) => {
        const userId = typeof p === 'object' && p !== null ? (p.user || p._id || p.userId) : p;
        if (!userId) {
          throw new Error(`Invalid user identifier in participant at index ${idx}`);
        }

        // Distribute remainder pennies one by one to initial participants
        const allocatedCents = baseShareCents + (remainderCents > 0 ? 1 : 0);
        if (remainderCents > 0) remainderCents--;

        const userAmount = round2(allocatedCents / 100);
        const userPercentage = round2((userAmount / amount) * 100);

        return {
          user: userId,
          amount: userAmount,
          percentage: userPercentage,
          shares: 1
        };
      });

      return {
        totalAmount: amount,
        splitType: SPLIT_TYPES.EQUAL,
        splits
      };
    }

    case SPLIT_TYPES.EXACT: {
      let sumCents = 0;
      const splits = participants.map((p, idx) => {
        const userId = p.user || p._id || p.userId;
        const userAmt = round2(Number(p.amount));

        if (!userId) {
          throw new Error(`Missing user identifier in EXACT split at index ${idx}`);
        }
        if (isNaN(userAmt) || userAmt < 0) {
          throw new Error(`Participant ${userId} has an invalid or negative amount: ${p.amount}`);
        }

        const cents = toCents(userAmt);
        sumCents += cents;

        return {
          user: userId,
          amount: userAmt,
          percentage: round2((userAmt / amount) * 100),
          shares: 1
        };
      });

      if (sumCents !== totalCents) {
        const diff = round2((totalCents - sumCents) / 100);
        throw new Error(
          `The sum of exact amounts ($${round2(sumCents / 100)}) does not equal total amount ($${amount}). Discrepancy: $${diff}`
        );
      }

      return {
        totalAmount: amount,
        splitType: SPLIT_TYPES.EXACT,
        splits
      };
    }

    case SPLIT_TYPES.PERCENTAGE: {
      let totalPercentage = 0;
      for (const p of participants) {
        const pct = Number(p.percentage);
        if (isNaN(pct) || pct < 0) {
          throw new Error(`Participant ${p.user || p.userId} has an invalid percentage: ${p.percentage}`);
        }
        totalPercentage += pct;
      }

      // Check sum of percentages is 100 (allow 0.05 margin for rounding)
      if (Math.abs(totalPercentage - 100) > 0.05) {
        throw new Error(`Total percentage must equal 100%. Current sum: ${round2(totalPercentage)}%`);
      }

      let allocatedCents = 0;
      const calculatedSplits = participants.map((p, idx) => {
        const userId = p.user || p._id || p.userId;
        if (!userId) throw new Error(`Missing user identifier in PERCENTAGE split at index ${idx}`);

        const pct = Number(p.percentage);
        const cents = Math.round((totalCents * pct) / 100);
        allocatedCents += cents;

        return {
          user: userId,
          cents,
          percentage: round2(pct)
        };
      });

      // Adjust rounding cent discrepancy if any on the largest percentage participant
      const diffCents = totalCents - allocatedCents;
      if (diffCents !== 0 && calculatedSplits.length > 0) {
        // Add discrepancy to first participant or participant with highest share
        calculatedSplits[0].cents += diffCents;
      }

      const splits = calculatedSplits.map((item) => ({
        user: item.user,
        amount: round2(item.cents / 100),
        percentage: item.percentage,
        shares: 1
      }));

      return {
        totalAmount: amount,
        splitType: SPLIT_TYPES.PERCENTAGE,
        splits
      };
    }

    case SPLIT_TYPES.SHARES: {
      let totalShares = 0;
      for (const p of participants) {
        const s = Number(p.shares);
        if (isNaN(s) || s <= 0) {
          throw new Error(`Participant ${p.user || p.userId} has invalid shares (must be > 0): ${p.shares}`);
        }
        totalShares += s;
      }

      let allocatedCents = 0;
      const intermediate = participants.map((p, idx) => {
        const userId = p.user || p._id || p.userId;
        if (!userId) throw new Error(`Missing user identifier in SHARES split at index ${idx}`);

        const s = Number(p.shares);
        const cents = Math.floor((totalCents * s) / totalShares);
        allocatedCents += cents;

        return {
          user: userId,
          shares: s,
          cents
        };
      });

      // Distribute any remaining cents
      let remCents = totalCents - allocatedCents;
      let i = 0;
      while (remCents > 0) {
        intermediate[i % intermediate.length].cents += 1;
        remCents--;
        i++;
      }

      const splits = intermediate.map((item) => {
        const userAmt = round2(item.cents / 100);
        return {
          user: item.user,
          amount: userAmt,
          percentage: round2((userAmt / amount) * 100),
          shares: item.shares
        };
      });

      return {
        totalAmount: amount,
        splitType: SPLIT_TYPES.SHARES,
        splits
      };
    }

    default:
      throw new Error(`Unsupported split type: ${splitType}. Supported types: ${Object.values(SPLIT_TYPES).join(', ')}`);
  }
}

/**
 * Computes net balances and simplifies debts between group members
 * Useful for "Who owes whom" calculation.
 *
 * @param {Array} expenses - List of group expenses
 * @param {Array} settlements - List of completed settlements
 * @param {Array} members - List of group members
 * @returns {Object} { netBalances: { [userId]: number }, simplifiedDebts: [{ from, to, amount }] }
 */
function calculateGroupBalances(expenses = [], settlements = [], members = []) {
  const netBalances = {};

  // Initialize members with zero balance
  members.forEach((m) => {
    const id = (m._id || m.id || m).toString();
    netBalances[id] = 0;
  });

  // Factor in approved expenses
  expenses.forEach((expense) => {
    if (expense.status === 'rejected') return;

    const payerId = (expense.paidBy?._id || expense.paidBy || '').toString();
    if (!netBalances[payerId]) netBalances[payerId] = 0;

    // Payer is credited the total amount
    netBalances[payerId] += expense.amount;

    // Each participant in splits is debited their share
    expense.splits?.forEach((split) => {
      const participantId = (split.user?._id || split.user || '').toString();
      if (!netBalances[participantId]) netBalances[participantId] = 0;
      netBalances[participantId] -= split.amount;
    });
  });

  // Factor in completed settlements
  settlements.forEach((settlement) => {
    if (settlement.status !== 'completed') return;

    const payerId = (settlement.payerId?._id || settlement.payerId || '').toString();
    const payeeId = (settlement.payeeId?._id || settlement.payeeId || '').toString();

    // Payer sent money, so their debt decreases (credited)
    if (!netBalances[payerId]) netBalances[payerId] = 0;
    netBalances[payerId] += settlement.amount;

    // Payee received money, so their credit decreases (debited)
    if (!netBalances[payeeId]) netBalances[payeeId] = 0;
    netBalances[payeeId] -= settlement.amount;
  });

  // Clean rounding
  Object.keys(netBalances).forEach((uid) => {
    netBalances[uid] = round2(netBalances[uid]);
  });

  // Simplify debts (Minimizing transaction count algorithm)
  const debtors = [];
  const creditors = [];

  Object.entries(netBalances).forEach(([userId, balance]) => {
    if (balance < -0.01) {
      debtors.push({ userId, amount: Math.abs(balance) });
    } else if (balance > 0.01) {
      creditors.push({ userId, amount: balance });
    }
  });

  // Sort descending
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const simplifiedDebts = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    const settleAmt = Math.min(debtor.amount, creditor.amount);

    if (settleAmt > 0.009) {
      simplifiedDebts.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: round2(settleAmt)
      });
    }

    debtor.amount = round2(debtor.amount - settleAmt);
    creditor.amount = round2(creditor.amount - settleAmt);

    if (debtor.amount <= 0.01) dIdx++;
    if (creditor.amount <= 0.01) cIdx++;
  }

  return {
    netBalances,
    simplifiedDebts
  };
}

module.exports = {
  calculateSplit,
  calculateGroupBalances,
  round2,
  toCents
};

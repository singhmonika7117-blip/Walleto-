/**
 * Minimal Cash Flow Debt Simplification (Greedy Min‑Cash‑Flow)
 * -------------------------------------------------------
 * Input: array of net balances per user (positive = creditor, negative = debtor)
 * Output: minimal set of settlement instructions [{ fromUserId, toUserId, amount }]
 *
 * The algorithm works by repeatedly matching the user with the largest debt
 * (most negative balance) with the user with the largest credit (most positive).
 * The smaller absolute amount is settled, balances are updated, and the process
 * continues until all balances are (approximately) zero.
 */

/**
 * Simplify debts for a group.
 * @param {Array<{userId:string, balance:number}>} balances - net balances per user
 * @returns {Array<{fromUserId:string, toUserId:string, amount:number}>}
 */
function simplifyDebts(balances) {
  // Clone to avoid mutating the caller's array
  const working = balances.map((b) => ({ userId: b.userId, balance: Number(b.balance) }));

  const settlements = [];

  const eps = 1e-2; // cents tolerance

  while (true) {
    // Find max creditor and max debtor
    let maxCred = null;
    let maxDeb = null;
    for (const entry of working) {
      if (entry.balance > eps) {
        if (!maxCred || entry.balance > maxCred.balance) maxCred = entry;
      } else if (entry.balance < -eps) {
        if (!maxDeb || entry.balance < maxDeb.balance) maxDeb = entry; // more negative
      }
    }
    // If none left, break
    if (!maxCred || !maxDeb) break;

    const settleAmt = Math.min(maxCred.balance, -maxDeb.balance);
    // Record settlement: debtor pays creditor
    settlements.push({
      fromUserId: maxDeb.userId,
      toUserId: maxCred.userId,
      amount: Math.round(settleAmt * 100) / 100, // round to 2 decimals
    });

    // Update balances
    maxCred.balance -= settleAmt;
    maxDeb.balance += settleAmt; // note: maxDeb.balance is negative
  }

  return settlements;
}

module.exports = { simplifyDebts };

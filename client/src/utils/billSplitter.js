// Utility functions for itemized bill splitting
// Calculates each member's share based on line items and proportional tax/tip distribution.

/**
 * Calculate member shares.
 * @param {Array} lineItems - Array of items { name:string, price:number, assignedUserIds:Array<string> }
 * @param {number} tax - Tax amount (absolute)
 * @param {number} tip - Tip amount (absolute)
 * @returns {{ [userId:string]: number }} mapping of userId to total share (subtotal + tax/tip portion)
 */
export function calculateItemizedShares(lineItems, tax = 0, tip = 0) {
  const memberSubtotals = {};
  let totalSubtotal = 0;

  // Aggregate subtotals per member
  lineItems.forEach(item => {
    const price = Number(item.price) || 0;
    if (price <= 0) return;
    const assignees = item.assignedUserIds || [];
    const sharePerPerson = assignees.length > 0 ? price / assignees.length : 0;
    assignees.forEach(uid => {
      memberSubtotals[uid] = (memberSubtotals[uid] || 0) + sharePerPerson;
      totalSubtotal += sharePerPerson;
    });
  });

  // Proportional distribution of tax and tip based on subtotal percentages
  const totalTaxTip = Number(tax) + Number(tip);
  const result = {};
  Object.entries(memberSubtotals).forEach(([uid, sub]) => {
    const proportion = totalSubtotal > 0 ? sub / totalSubtotal : 0;
    const taxTipShare = totalTaxTip * proportion;
    const total = sub + taxTipShare;
    // Round to two decimals to avoid floating errors
    result[uid] = Math.round(total * 100) / 100;
  });

  return result;
}

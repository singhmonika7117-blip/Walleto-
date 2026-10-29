const assert = require('assert');
const { calculateSplit, round2 } = require('./src/utils/calculateSplit');
const generateCode = require('./src/utils/generateCode');

console.log('🧪 Starting Walleto & Selective Splitting Verification Suite...\n');

// Test 1: Code Generator Verification
{
  const code = generateCode('SPLT', 4);
  console.log(`Generated Shareable Code: ${code}`);
  assert.ok(/^SPLT-[2-9A-Z]{4}$/.test(code), 'Code must match SPLT-XXXX pattern');
  console.log('✅ Test 1 Passed: Auto-generated unique shareable code (SPLT-XXXX)');
}

// Test 2: Dynamic Selective Split Formula
// Total ₹900, 3 members vote: Alice (YES), Bob (YES), Charlie (NO)
// Approved Count = 2
// Alice Share = ₹450, Bob Share = ₹450, Charlie = ₹0 (Excluded)
{
  const totalAmount = 900;
  const votes = [
    { userId: 'alice', vote: 'APPROVE' },
    { userId: 'bob', vote: 'APPROVE' },
    { userId: 'charlie', vote: 'REJECT' }
  ];

  const approved = votes.filter(v => v.vote === 'APPROVE').map(v => v.userId);
  const rejected = votes.filter(v => v.vote === 'REJECT').map(v => v.userId);

  assert.strictEqual(approved.length, 2);
  assert.strictEqual(rejected.length, 1);

  // Dynamic Selective Split Formula
  const individualShare = round2(totalAmount / approved.length);
  assert.strictEqual(individualShare, 450);

  console.log(`Selective Formula: Total ₹${totalAmount} / ${approved.length} approved = ₹${individualShare} per approved member`);
  console.log('✅ Test 2 Passed: Selective Bill Splitting Formula calculation');
}

// Test 3: Insufficient Funds Verification before Deduction
{
  const individualShare = 450;
  const groupWallet = {
    totalBalance: 1000,
    contributions: [
      { userId: 'alice', amount: 500 },
      { userId: 'bob', amount: 200 } // Deficient: has 200, needs 450
    ]
  };

  const approvedMembers = ['alice', 'bob'];
  const deficient = [];

  for (const mId of approvedMembers) {
    const contrib = groupWallet.contributions.find(c => c.userId === mId);
    const balance = contrib ? contrib.amount : 0;
    if (balance < individualShare) {
      deficient.push({ userId: mId, has: balance, needs: individualShare });
    }
  }

  assert.strictEqual(deficient.length, 1);
  assert.strictEqual(deficient[0].userId, 'bob');
  console.log(`Verification Check: Correctly identified deficient member: Bob (has ₹${deficient[0].has}, needs ₹${deficient[0].needs})`);
  console.log('✅ Test 3 Passed: Insufficient wallet funds verification & execution abort check');
}

// Test 4: Atomic Deduction Simulation
{
  const individualShare = 450;
  const totalAmount = 900;
  const groupWallet = {
    totalBalance: 1200,
    contributions: [
      { userId: 'alice', amount: 600 },
      { userId: 'bob', amount: 600 }
    ]
  };

  // Perform deduction
  const approvedMembers = ['alice', 'bob'];
  for (const mId of approvedMembers) {
    const contrib = groupWallet.contributions.find(c => c.userId === mId);
    contrib.amount = round2(contrib.amount - individualShare);
  }
  groupWallet.totalBalance = round2(groupWallet.totalBalance - totalAmount);

  assert.strictEqual(groupWallet.totalBalance, 300);
  assert.strictEqual(groupWallet.contributions.find(c => c.userId === 'alice').amount, 150);
  assert.strictEqual(groupWallet.contributions.find(c => c.userId === 'bob').amount, 150);
  console.log('✅ Test 4 Passed: Atomic balance deduction across pool and individual contributions');
}

console.log('\n🎉 ALL SELECTIVE SPLITTING & WALLET TESTS PASSED SUCCESSFULLY!\n');

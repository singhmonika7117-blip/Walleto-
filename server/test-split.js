const assert = require('assert');
const { calculateSplit, calculateGroupBalances, round2 } = require('./src/utils/calculateSplit');
const { SPLIT_TYPES } = require('./src/config/constants');

console.log('🧪 Starting Split Engine Verification Tests...\n');

// Test 1: Equal Split with clean division
{
  const res = calculateSplit({
    totalAmount: 90,
    splitType: SPLIT_TYPES.EQUAL,
    participants: ['user1', 'user2', 'user3']
  });
  assert.strictEqual(res.splits.length, 3);
  assert.strictEqual(res.splits[0].amount, 30);
  assert.strictEqual(res.splits[1].amount, 30);
  assert.strictEqual(res.splits[2].amount, 30);
  console.log('✅ Test 1 Passed: Equal split clean division ($90 / 3)');
}

// Test 2: Equal Split with penny distribution ($100 / 3 = 33.34, 33.33, 33.33)
{
  const res = calculateSplit({
    totalAmount: 100,
    splitType: SPLIT_TYPES.EQUAL,
    participants: ['user1', 'user2', 'user3']
  });
  const sum = res.splits.reduce((acc, s) => acc + s.amount, 0);
  assert.strictEqual(round2(sum), 100);
  assert.strictEqual(res.splits[0].amount, 33.34);
  assert.strictEqual(res.splits[1].amount, 33.33);
  assert.strictEqual(res.splits[2].amount, 33.33);
  console.log('✅ Test 2 Passed: Equal split penny precision ($100 / 3)');
}

// Test 3: Exact Split
{
  const res = calculateSplit({
    totalAmount: 150.50,
    splitType: SPLIT_TYPES.EXACT,
    participants: [
      { user: 'u1', amount: 50.25 },
      { user: 'u2', amount: 100.25 }
    ]
  });
  const sum = res.splits.reduce((acc, s) => acc + s.amount, 0);
  assert.strictEqual(round2(sum), 150.50);
  console.log('✅ Test 3 Passed: Exact split validation');
}

// Test 4: Percentage Split
{
  const res = calculateSplit({
    totalAmount: 200,
    splitType: SPLIT_TYPES.PERCENTAGE,
    participants: [
      { user: 'u1', percentage: 25 },
      { user: 'u2', percentage: 75 }
    ]
  });
  assert.strictEqual(res.splits[0].amount, 50);
  assert.strictEqual(res.splits[1].amount, 150);
  console.log('✅ Test 4 Passed: Percentage split (25% and 75%)');
}

// Test 5: Shares Split (2 shares vs 1 share of $90 -> $60 and $30)
{
  const res = calculateSplit({
    totalAmount: 90,
    splitType: SPLIT_TYPES.SHARES,
    participants: [
      { user: 'u1', shares: 2 },
      { user: 'u2', shares: 1 }
    ]
  });
  assert.strictEqual(res.splits[0].amount, 60);
  assert.strictEqual(res.splits[1].amount, 30);
  console.log('✅ Test 5 Passed: Proportional shares split (2:1)');
}

// Test 6: Debt Simplification
{
  const members = [{ _id: 'A' }, { _id: 'B' }, { _id: 'C' }];
  const expenses = [
    {
      amount: 60,
      paidBy: 'A',
      status: 'approved',
      splits: [
        { user: 'A', amount: 20 },
        { user: 'B', amount: 20 },
        { user: 'C', amount: 20 }
      ]
    }
  ];
  const settlements = [];

  const { netBalances, simplifiedDebts } = calculateGroupBalances(expenses, settlements, members);
  assert.strictEqual(netBalances['A'], 40);
  assert.strictEqual(netBalances['B'], -20);
  assert.strictEqual(netBalances['C'], -20);
  assert.strictEqual(simplifiedDebts.length, 2);
  console.log('✅ Test 6 Passed: Net balance & debt simplification matrix');
}

console.log('\n🎉 ALL SPLIT ENGINE TESTS PASSED SUCCESSFULLY!\n');

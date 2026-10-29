const http = require('http');
const express = require('express');
const { io: Client } = require('../client/node_modules/socket.io-client');
const assert = require('assert');
const {
  initSocket,
  notifyNewApprovalRequest,
  notifyVoteSubmitted,
  notifyApprovalFinalized
} = require('./src/services/socketService');

console.log('🧪 Starting Socket.io Phase 5 Real-Time Event Broadcasting Verification...\n');

const app = express();
const server = http.createServer(app);
const ioServer = initSocket(server, '*');

server.listen(0, async () => {
  const port = server.address().port;
  const serverUrl = `http://localhost:${port}`;
  console.log(`📡 Test Server running on port ${port}`);

  const groupId = 'testGroup123';
  const otherGroupId = 'otherGroup999';

  // Client 1: Joins testGroup123
  const client1 = Client(serverUrl, { transports: ['websocket'] });
  // Client 2: Joins testGroup123
  const client2 = Client(serverUrl, { transports: ['websocket'] });
  // Client 3: Joins otherGroup999 (Room isolation check)
  const client3 = Client(serverUrl, { transports: ['websocket'] });

  await new Promise((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 3) resolve();
    };
    client1.on('connect', check);
    client2.on('connect', check);
    client3.on('connect', check);
  });

  console.log('🔌 3 Test Clients Connected successfully.');

  // Join rooms
  client1.emit('join_group', groupId);
  client2.emit('join_group', groupId);
  client3.emit('join_group', otherGroupId);

  // Allow room join propagation
  await new Promise((r) => setTimeout(r, 100));

  // Test 1: notifyNewApprovalRequest
  console.log('\n--- Test 1: notifyNewApprovalRequest broadcasting ---');
  let client1ReceivedNew = null;
  let client3ReceivedNew = null;

  client1.on('APPROVAL_REQUEST_CREATED', (data) => {
    client1ReceivedNew = data;
  });
  client3.on('APPROVAL_REQUEST_CREATED', (data) => {
    client3ReceivedNew = data;
  });

  const sampleApproval = {
    _id: 'appr001',
    groupId,
    title: 'Dinner at Bistro',
    totalAmount: 1200,
    individualShare: 1200,
    status: 'VOTING'
  };

  notifyNewApprovalRequest(groupId, sampleApproval);
  await new Promise((r) => setTimeout(r, 100));

  assert.ok(client1ReceivedNew, 'Client 1 should receive APPROVAL_REQUEST_CREATED');
  assert.strictEqual(client1ReceivedNew.approvalId, 'appr001');
  assert.strictEqual(client1ReceivedNew.title, 'Dinner at Bistro');
  assert.strictEqual(client3ReceivedNew, null, 'Client 3 in other room should NOT receive the event');
  console.log('✅ Test 1 Passed: APPROVAL_REQUEST_CREATED broadcasted correctly with room isolation');

  // Test 2: notifyVoteSubmitted
  console.log('\n--- Test 2: notifyVoteSubmitted broadcasting ---');
  let client2ReceivedVote = null;
  client2.on('VOTE_UPDATED', (data) => {
    client2ReceivedVote = data;
  });

  const sampleVotes = [
    { userId: 'userA', vote: 'APPROVE' },
    { userId: 'userB', vote: 'APPROVE' }
  ];
  const sharePerMember = 600; // 1200 / 2

  notifyVoteSubmitted(groupId, 'appr001', sampleVotes, sharePerMember, {
    approvedParticipantsCount: 2
  });
  await new Promise((r) => setTimeout(r, 100));

  assert.ok(client2ReceivedVote, 'Client 2 should receive VOTE_UPDATED');
  assert.strictEqual(client2ReceivedVote.approvalId, 'appr001');
  assert.strictEqual(client2ReceivedVote.sharePerMember, 600);
  assert.strictEqual(client2ReceivedVote.updatedResponses.length, 2);
  console.log('✅ Test 2 Passed: VOTE_UPDATED broadcasted with updated votes and share per member');

  // Test 3: notifyApprovalFinalized
  console.log('\n--- Test 3: notifyApprovalFinalized broadcasting ---');
  let client1ReceivedFinal = null;
  client1.on('APPROVAL_FINALIZED', (data) => {
    client1ReceivedFinal = data;
  });

  const finalParticipants = ['userA', 'userB'];
  notifyApprovalFinalized(groupId, 'appr001', 'EXECUTED', finalParticipants, {
    totalDeducted: 1200
  });
  await new Promise((r) => setTimeout(r, 100));

  assert.ok(client1ReceivedFinal, 'Client 1 should receive APPROVAL_FINALIZED');
  assert.strictEqual(client1ReceivedFinal.approvalId, 'appr001');
  assert.strictEqual(client1ReceivedFinal.status, 'EXECUTED');
  assert.strictEqual(client1ReceivedFinal.finalParticipants.length, 2);
  console.log('✅ Test 3 Passed: APPROVAL_FINALIZED broadcasted with status and final participants');

  // Cleanup
  client1.disconnect();
  client2.disconnect();
  client3.disconnect();
  ioServer.close();
  server.close(() => {
    console.log('\n🎉 ALL SOCKET BROADCASTING VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  });
});

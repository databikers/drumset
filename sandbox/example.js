const { Saga } = require('../dist');

const calls = [];

const facts = {
  balance: 9,
  amount: 10,
  to: 'a',
  from: 'b',
};

const saga = new Saga();

saga.addNode(
  'A',
  async (facts, next, exit, retry) => {
    console.log(`A executed`);
    calls.push('A');
    next([
      'B',
      'C',
    ]);
  },
  {
    retriesLimit: 1,
    rollbackWhenErrorNode: 'CompensateA',
    rollbackWhenSuccessNode: 'RollbackA',
  },
  {
    minNodes: 1,
    maxNodes: 2,
    queueSizeScalingThreshold: 10,
  },
);

saga.addNode(
  'CompensateA',
  async (facts, next, exit, retry) => {
    console.log(`CompensateA executed`);
    calls.push('CompensateA');
    next('Error');
  },
  {
    retriesLimit: 1,
  },
  {
    minNodes: 1,
    maxNodes: 2,
    queueSizeScalingThreshold: 5,
  },
);

saga.addNode(
  'RollbackA',
  async (facts, next, exit, retry) => {
    console.log(`RollbackA executed`);
    calls.push('RollbackA');
  },
  {
    retriesLimit: 1,
  },
  {
    minNodes: 1,
    maxNodes: 2,
    queueSizeScalingThreshold: 5,
  },
);

saga.addNode(
  'B',
  async (facts, next, exit, retry) => {
    await new Promise((resolve) => setTimeout(resolve, Math.round(Math.random() * 1000)));
    console.log(`B executed`);
    calls.push('B');
    // throw new Error('Something went wrong');
    next('D');
  },
  {
    retriesLimit: 2,
    rollbackWhenErrorNode: 'CompensateB',
    rollbackWhenSuccessNode: 'RollbackB',
  },
  {
    minNodes: 1,
    maxNodes: 2,
    queueSizeScalingThreshold: 5,
  },
);

saga.addNode(
  'CompensateB',
  async (facts, next, exit, retry) => {
    console.log(`CompensateB executed`);
    calls.push('CompensateB');
    next('Error');
  },
  {
    retriesLimit: 1,
  },
  {
    minNodes: 1,
    maxNodes: 2,
    queueSizeScalingThreshold: 5,
  },
);

saga.addNode(
  'RollbackB',
  async (facts, next, exit, retry) => {
    console.log(`RollbackBexecuted`);
    calls.push('RollbackB');
  },
  {
    retriesLimit: 1,
  },
  {
    minNodes: 1,
    maxNodes: 2,
    queueSizeScalingThreshold: 5,
  },
);

saga.addNode(
  'C',
  async (facts, next, exit, retry) => {
    console.log(`C executed`);
    // Move an error throwing to another node to check result
    // throw new Error('Something went wrong');
    calls.push('C');
    next('D');
  },
  {
    retriesLimit: 1,
    rollbackWhenErrorNode: 'CompensateC',
    rollbackWhenSuccessNode: 'RollbackC',
  },
  {
    minNodes: 1,
    maxNodes: 2,
    queueSizeScalingThreshold: 5,
  },
);
saga.addNode(
  'D',
  async (facts, next, exit, retry) => {
    // throw new Error('Something went wrong');
    console.log(`D executed`);
    calls.push('D');
    next('Success');
  },
  {
    retriesLimit: 1,
    rollbackWhenErrorNode: 'CompensateD',
    rollbackWhenSuccessNode: 'RollbackD',
    runAfterNodesSucceed: [
      'B',
      'C',
    ],
  },
  {
    minNodes: 2,
    maxNodes: 4,
    queueSizeScalingThreshold: 5,
  },
);

saga.addNode(
  'CompensateC',
  async (facts, next, exit, retry) => {
    console.log(`CompensateC executed`);
    calls.push('CompensateC');
    next('Error');
  },
  {
    retriesLimit: 3,
  },
  {
    minNodes: 1,
    maxNodes: 2,
    queueSizeScalingThreshold: 5,
  },
);

saga.addNode(
  'CompensateD',
  async (facts, next, exit, retry) => {
    console.log(`CompensateD executed`);
    calls.push('CompensateD');
    next('Error');
  },
  {
    retriesLimit: 3,
  },
  {
    minNodes: 1,
    maxNodes: 2,
    queueSizeScalingThreshold: 5,
  },
);

saga.addNode(
  'RollbackC',
  async (facts, next, exit, retry) => {
    await new Promise((resolve) => setTimeout(resolve, Math.round(Math.random() * 2000)));
    console.log(`RollbackC executed`);
    calls.push('RollbackC');
  },
  {
    retriesLimit: 1,
  },
  {
    minNodes: 1,
    maxNodes: 2,
    queueSizeScalingThreshold: 5,
  },
);

saga.addNode(
  'RollbackD',
  async (facts, next, exit, retry) => {
    await new Promise((resolve) => setTimeout(resolve, Math.round(Math.random() * 2000)));
    console.log(`RollbackD executed`);
    calls.push('RollbackD');
  },
  {
    retriesLimit: 1,
  },
  {
    minNodes: 1,
    maxNodes: 2,
    queueSizeScalingThreshold: 5,
  },
);

saga.addNode(
  'Error',
  async (facts, next, exit, retry, error) => {
    console.log(`Error executed`);
    calls.push('Error');
    exit(error);
  },
  {
    retriesLimit: 2,
    timeoutBetweenRetries: 1000,
  },
  {
    minNodes: 1,
    maxNodes: 5,
    queueSizeScalingThreshold: 10,
  },
);

saga.addNode(
  'Success',
  async (facts, next, exit) => {
    console.log(`Success executed`);
    calls.push('Success');
    exit('E');
  },
  { retriesLimit: 1 },
  {
    minNodes: 1,
    maxNodes: 2,
    queueSizeScalingThreshold: 5,
  },
);

saga.addNode(
  'E',
  async (facts, next, exit) => {
    console.log(`E executed`);
    calls.push('E');
    exit();
  },
  { retriesLimit: 1 },
  {
    minNodes: 1,
    maxNodes: 2,
    queueSizeScalingThreshold: 5,
  },
);

saga.addMiddleware(
  [
    'A',
  ],
  [
    async (facts) => {
      console.log(`Middleware executed`);
    },
  ],
);

setTimeout(() => {
  console.log(calls);
}, 10000);

saga
  .process('A', facts)
  .then((result) => {
    console.log({ result });
  })
  .catch((error) => console.log({ error }))
  .finally(() => {
    console.log(calls);
  });

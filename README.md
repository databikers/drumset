# Drumset

The `drumset` package provides a robust and user-friendly framework for managing complex workflows using the saga pattern.
This pattern is particularly useful for handling distributed transactions by defining a sequence of steps (nodes)
and the logic for compensating (undoing) steps when failures occur. By defining saga's nodes and their relationships,
you can ensure reliable and consistent transaction processing, even in the presence of failures.

```shell

npm i -s drumset

```

Creates a new instance of the `Saga` class.

```javascript
import { Saga } from 'drumset';

const saga = new Saga({
  verbose: true,
  logger: console,
});
```

### Saga instance methods:

#### `addNode(name, handler, meta, scalingFactor = 1)`

Adds a node to the saga.

- **Parameters:**
  - `name` (string): The name of the node.
  - `handler` (function): An asynchronous function that performs the node's operation. The function receives the following arguments:
    - `facts` (object): The current state of the saga.
    - `next` (function): A function to call the next node.
    - `exit` (function): A function to complete the saga or terminate it with an error.
    - `retry` (function): A function to retry processing of the facts on the current node.
  - `meta` (object, optional): Additional processing options for the node.
    - `retriesLimit` (number): The maximum number of retries for the node.
    - `timeoutBetweenRetries` (number): The time in milliseconds to wait between retries.
    - `compensatorNode` (string): The name of the node to call for compensation if this node fails.
  - `scaling` (object, optional): Additional processing options for the node:
    - `minNodes`: The min count of concurrent nodes that use one queue. 
    - `maxNodes`: The max count of concurrent nodes that use one queue. This determines how many instances of this node can run concurrently.
    - `queueSizeScalingThreshold`: threshold of the queue size to run the horizontal scaling

#### `process(startNode, facts)`

Starts the saga from the specified node.

- **Parameters:**
  - `startNode` (string): The name of the node to start the saga.
  - `facts` (object): The initial state of the saga.
- **Returns:**
  - `Promise`: Resolves with the final state of the saga or rejects with an error.

### Example Usage:

```javascript
const { Saga } = require('drumset');

function makeCallingToUnstableAPi() {
  return Math.random() < 0.5 ? Promise.resolve(true) : Promise.reject(new Error('Today is not your day'));
}

const saga = new Saga();

saga.addNode(
  'validateOrder',
  async (facts, next, exit, retry) => {
    console.log(`validateOrder -> `);
    if (!facts.amount) {
      exit(new Error('Amount is required value'));
    }
    if (!facts.balance && facts?.balance !== 0) {
      exit(new Error('Balance is required value'));
    }
    if (!facts.from) {
      exit(new Error('Sender is required value'));
    }
    if (!facts.to) {
      exit(new Error('Receiver is required value'));
    }
    if (facts.to === facts.from) {
      exit(new Error(`sender and receiver couldn't be the same`));
    }
    if (facts.amount > facts.balance) {
      exit(new Error('Not enough balance'));
    }
    facts.status = 'scheduled';
    next('processOrder');
  },
  { retriesLimit: 1 },
  {
    minNodes: 1,
    maxNodes: 5,
    queueSizeScalingThreshold: 10
  },
);

saga.addNode(
  'processOrder',
  async (facts, next, exit, retry) => {
    console.log(`processOrder -> `);
    facts.balance -= facts.amount;
    facts.status = 'processed';
    next('storeOrder');
  },
  { retriesLimit: 1 },
  {
    minNodes: 1,
    maxNodes: 3,
    queueSizeScalingThreshold: 5
  },
);

saga.addNode(
  'storeOrder',
  async (facts, next, exit, retry) => {
    console.log(`storeOrder -> `);
    await makeCallingToUnstableAPi();
    next('finalizeOrder');
  },
  {
    retriesLimit: 2,
    timeoutBetweenRetries: 1000,
    compensatorNode: 'compensateStoreOrder',
  },
  {
    minNodes: 1,
    maxNodes: 5,
    queueSizeScalingThreshold: 10
  },
);

saga.addNode(
  'compensateStoreOrder',
  async (facts, next, exit, retry) => {
    console.log(`compensateStoreOrder -> `);
    facts.balance += facts.amount;
    facts.status = 'declined';
    exit(new Error('Transaction declined'));
  },
  { retriesLimit: 1 },
  {
    minNodes: 1,
    maxNodes: 2,
    queueSizeScalingThreshold: 5
  },
);

saga.addNode(
  'finalizeOrder',
  async function (facts, next, exit, retry) {
    console.log(`finalizeOrder -> `);
    facts.txn_id = new Date().getTime().toString(16);
    facts.status = 'completed';
    exit();
  },
  { retriesLimit: 1 },
  {
    minNodes: 1,
    maxNodes: 3,
    queueSizeScalingThreshold: 5
  },
);

const facts = {
  balance: 1000,
  amount: 10,
  to: 'a',
  from: 'b',
};

saga
  .process('validateOrder', facts)
  .then((result) => {
    console.log({ result });
  })
  .catch(console.error);
```

### Node Definitions

1. **validateOrder**: Validates the order details such as `amount`, `balance`, `from`, and `to` addresses. It ensures the order is valid before proceeding.

2. **processOrder**: Deducts the order amount from the balance and updates the status to `processed`.

3. **storeOrder**: Attempts to store the order and calls an unstable API. This node has retry logic with a limit and timeout, and a compensator node to handle failures.

4. **compensateStoreOrder**: Compensates for the order in case of failure by restoring the balance and setting the status to `declined`.

5. **finalizeOrder**: Finalizes the order by generating a transaction ID and setting the status to `completed`.


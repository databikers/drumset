// Run, press Ctrl+C during the retry delay, then run again: the fact resumes where it stopped.
const fs = require('fs/promises');
const { Saga } = require('../dist');

const FILE = `${__dirname}/facts.json`;

const storage = {
  async load() {
    return JSON.parse(await fs.readFile(FILE, 'utf8').catch(() => '[]'));
  },
  async save(facts) {
    await fs.writeFile(FILE, JSON.stringify(facts, null, 2));
    console.log(`saved ${facts.length} unfinished fact(s) to ${FILE}`);
  },
};

const saga = new Saga({ storage });

saga.addNode('Reserve', async (order, next) => next('Charge'), { rollbackWhenSuccessNode: 'Release' });
saga.addNode(
  'Charge',
  async (order, next) => {
    order.attempt = (order.attempt || 0) + 1;
    if (order.attempt < 2) throw new Error('payment gateway timeout');
    next('Notify');
  },
  { retriesLimit: 2, timeoutBetweenRetries: 5000 },
);
saga.addNode('Notify', async (order, next, exit) => exit());
saga.addNode('Release', async () => {});

saga.on('completed', (fact) => console.log('completed', fact.id, JSON.stringify(fact.meta.nodes.Charge, null, 2)));

(async () => {
  const resumed = await saga.restore();
  if (resumed) {
    console.log(`resumed ${resumed} fact(s)`);
    return;
  }
  saga.process('Reserve', { order: 42 });
  console.log('Charge failed once and retries in 5 s: press Ctrl+C now to save it, then run again');
})();

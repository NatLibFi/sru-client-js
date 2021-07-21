import createSruClient from './index';

run();

/* eslint-disable max-statements, no-console */
function run() {
  const SRU_URL = process.env['SRU_URL']; // eslint-disable-line
  const [,, rawPArgs] = process.argv;
  const pArgs = rawPArgs.split(',');
  const retrieveAll = !(pArgs[1] === 'false' || pArgs[1] === '0');
  const recordSchema = pArgs[2] || 'marcxml';
  const sruClient = createSruClient({url: SRU_URL, recordSchema, retrieveAll});
  sruClient.searchRetrieve(pArgs[0])
    .on('total', onTotal)
    .on('record', onRecord)
    .on('end', onEnd)
    .on('error', onError);


  function onTotal(total) {
    console.log('********************'); // eslint-disable-line
    console.log(total); // eslint-disable-line
    console.log('********************'); // eslint-disable-line
  }

  function onRecord(record) { // eslint-disable-line
    // Comment: console.log(record); // eslint-disable-line
    console.log('.'); //eslint-disable-line
  }

  function onEnd(nextRecordOffset) {
    console.log('********** THE END **********'); // eslint-disable-line
    console.log(nextRecordOffset); // eslint-disable-line
    console.log('********************'); // eslint-disable-line
  }

  function onError(err) {
    console.log(err); // eslint-disable-line
  }
}


// Add  --help

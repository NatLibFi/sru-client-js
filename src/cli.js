import createSruClient from './index';

run();

/* eslint-disable max-statements, no-console */
function run() {
  const SRU_URL = process.env['SRU_URL']; // eslint-disable-line
  const [,, rawPArgs] = process.argv;
  const pArgs = rawPArgs.split(',');

  if (pArgs[0].match('help')) {
    help();
    return;
  }

  const outputRecord = !(pArgs[1] === 'false' || pArgs[1] === '0');
  const retrieveAll = !(pArgs[2] === 'false' || pArgs[2] === '0');
  const recordSchema = pArgs[3] || 'marcxml';
  const sruClient = createSruClient({url: SRU_URL, recordSchema, retrieveAll});

  // eslint-disable-next-line functional/no-let
  let recordCounter = 0;
  // eslint-disable-next-line functional/no-let
  let recordTotal = 0;

  sruClient.searchRetrieve(pArgs[0])
    .on('total', onTotal)
    .on('record', onRecord)
    .on('end', onEnd)
    .on('error', onError);


  function onTotal(total) {
    console.log('********************');
    recordTotal = total;
    console.log(total);
    console.log('********************');
  }

  function onRecord(record) { // eslint-disable-line
    // Comment: console.log(record);
    recordCounter++; //eslint-disable-line
    console.log(`Record ${recordCounter}/${recordTotal}`);
    // eslint-disable-next-line functional/no-conditional-statements
    if (outputRecord) {
      console.log(record);
    }
  }

  function onEnd(nextRecordOffset) {
    console.log('********** THE END **********');
    console.log(`NextRecordOffset: ${nextRecordOffset}`);
    console.log('********************');
  }

  function onError(err) {
    console.log(`Error: ${err}`);
  }
}

function help() {
  const help = 'cli.js query,outputRecord,retrieveAll,recordSchema\n\t- query: sru query (mandatory)\n\t- outputRecord: true/false (default true)\n\t- retrieveAll true/false (default true),\n\t- recordSchema: recordSchema (default marcxml)\ncli.js help - this help';
  console.log(help);
}

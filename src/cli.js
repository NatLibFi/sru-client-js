import fs from 'fs';
import yargs from 'yargs';
import {createLogger, handleInterrupt} from '@natlibfi/melinda-backend-commons';
import createSruClient from './index';

run();

/* eslint-disable max-statements, no-console */
function run() {
  const logger = createLogger();

  process
    .on('SIGINT', handleInterrupt)
    .on('unhandledRejection', handleInterrupt)
    .on('uncaughtException', handleInterrupt);

  const args = yargs(process.argv.slice(2))
    .scriptName('sru-cli')
    .wrap(yargs.terminalWidth())
    .epilog('Copyright (C) 2025 University Of Helsinki (The National Library Of Finland)')
    .usage('Environment variable info in example.env')
    .usage('Installed globally: $0 <operation> [options]')
    .usage('Not installed: npx $0 <operation> [options]')
    .usage('Build from source: node dist/index.js <operation> [options]')
    .showHelpOnFail(true)
    .example([
      ['$ node dist/cli.js rec.id=001234567'],
      ['$ node dist/cli.js dc.title="malli" -s true'],
      ['$ node dist/cli.js query']
    ])
    .version()
    .env('SRU')
    .positional('query', {type: 'string', describe: 'sru query'})
    .options({
      s: {alias: 'showOutputRecord', type: 'boolean', default: false, describe: ''},
      o: {alias: 'overwriteFiles', type: 'boolean', default: true, describe: ''},
      a: {alias: 'retrieveAll', type: 'boolean', default: false, describe: 'Retrieve all record for query'},
      r: {alias: 'recordSchema', type: 'marcxml', default: false, describe: 'Sru endpoint record schema'},
      m: {alias: 'metadataFormat', type: 'string', default: 'string', describe: 'Record output schema'},
      w: {alias: 'writeFiles', type: 'boolean', default: false, describe: 'Record output as files'}
    })
    .check((args) => {
      const [query] = args._;
      if (query === undefined) {
        throw new Error('No query given');
      }

      return true;
    })
    .parseSync();

  //logger.debug(JSON.stringify(args));
  const [query] = args._;
  const {url, showOutputRecord, writeFiles, retrieveAll, recordSchema, metadataFormat, overwriteFiles} = args;
  const sruClient = createSruClient({url, recordSchema, retrieveAll, metadataFormat});

  // eslint-disable-next-line functional/no-let
  let recordCounter = 0;
  // eslint-disable-next-line functional/no-let
  let recordTotal = 0;

  sruClient.searchRetrieve(query)
    .on('total', onTotal)
    .on('record', onRecord)
    .on('end', onEnd)
    .on('error', onError);


  function onTotal(total) {
    recordTotal = total;
    console.log('********************');
    console.log(`Query has total of ${total} records`);
    console.log('********************');
  }

  function onRecord(record) { // eslint-disable-line
    // Comment: console.log(record);
    recordCounter++; //eslint-disable-line
    console.log(`Record ${recordCounter}/${recordTotal}`);

    if (showOutputRecord) {
      console.log('Output:'); // eslint-disable-line
      console.log(record); // eslint-disable-line
    }

    const folder = './results';

    if (writeFiles) {
      console.log(`Writing to file: ${folder}/${recordCounter}`); // eslint-disable-line
      prepareFolder(folder, recordCounter);
      fs.writeFileSync(`${folder}/${recordCounter}`, record);
      return;
    }

    function prepareFolder(folder, fileName) {
      if (fs.existsSync(folder)) {
        if (overwriteFiles) {
          return;
        }

        if (fs.existsSync(`${folder}/${fileName}`)) {
          throw new Error(`${folder}/${fileName} allready exist`);
        }

        return;
      }

      fs.mkdirSync(folder);
      return;
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

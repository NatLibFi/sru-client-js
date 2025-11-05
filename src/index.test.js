import createClient, {SruSearchError} from './index.js';
import assert from 'node:assert';
import {READERS} from '@natlibfi/fixura';
import generateTests from '@natlibfi/fixugen-http-client';
import createDebugLogger from 'debug';

const debug = createDebugLogger('@natlibfi/sru-client:test');

generateTests({
  callback,
  path: [import.meta.dirname, '..', 'test-fixtures'],
  fixura: {
    reader: READERS.TEXT
  }
});

function callback({getFixture, defaultParameters, method, error, expectedError, expectedNextOffset, expectedTotalCount}) {
  const expectedRecords = getFixture({components: ['expected-records.json'], reader: READERS.JSON});

  let recordCount = 0;
  const records = [];

  const client = createClient({...defaultParameters, url: 'http://foo.bar'});

  return new Promise((resolve, reject) => {
    client[method.name](method.parameters)
      .on('error', err => {
        debug(`Got error ${err}`);
        if (err instanceof SruSearchError) {
          debug(`This is a SruSearchError`);
        }
        try {
          if (expectedError) {
            assert.match(err.message, new RegExp(expectedError.error, 'u'));
            if (expectedError.expectedErrorInstance === 'SruSearchError') {
              debug(`This should be an ${expectedError.expectedErrorInstance}`);
              assert(err instanceof SruSearchError);
            }
            return resolve();
          }

          throw new Error(`Unexpected error: ${error}`);
        } catch (err) {
          reject(err);
        }
      })
      .on('record', record => {
        debug(`Got record ${recordCount + 1}: ${record}`);
        records.push(record);
        try {
          assert.deepEqual(expectedRecords[recordCount], record);
          recordCount++; // eslint-disable-line no-plusplus
        } catch (err) {
          reject(err);
        }
      })
      .on('total', totalNumberOfRecords => {
        debug(`Got total: ${totalNumberOfRecords}`);
        try {
          assert.equal(Number(expectedTotalCount), totalNumberOfRecords);
        } catch (err) {
          reject(err);
        }
      })

      .on('end', nextOffset => {
        debug(`Got end, nextOffset: ${nextOffset}`);
        debug(`Fetched records: (${records.length}): ${JSON.stringify(records)}`);
        debug(`Expected records: (${expectedRecords.length}): ${JSON.stringify(expectedRecords)}`);
        assert.deepEqual(expectedRecords, records);

        try {
          if (nextOffset) {
            debug('Got nextOffset');
            assert.equal(Number(expectedNextOffset), nextOffset);
            return resolve();
          }

          /*
          // if (nextOffset === undefined) {
          //   expect(expectedNextOffset.to.eql('undefined'));
          //  return resolve();
          //}
          */

          if (nextOffset) {
            throw new Error(`Unexpected next offset: ${nextOffset}`);
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      });
  });
}

import createClient, {SruSearchError} from '.';
import {expect} from 'chai';
import {READERS} from '@natlibfi/fixura';
import generateTests from '@natlibfi/fixugen-http-client';
import createDebugLogger from 'debug';

const debug = createDebugLogger('@natlibfi/sru-client:test');

generateTests({
  callback,
  path: [__dirname, '..', 'test-fixtures'],
  fixura: {
    reader: READERS.TEXT
  }
});

function callback({getFixture, defaultParameters, method, error, expectedError, expectedNextOffset, expectedTotalCount}) {
  const expectedRecords = getFixture({components: ['expected-records.json'], reader: READERS.JSON});

  let recordCount = 0; // eslint-disable-line functional/no-let
  const records = []; // eslint-disable-line functional/no-let

  const client = createClient({...defaultParameters, url: 'http://foo.bar'});

  return new Promise((resolve, reject) => {
    client[method.name](method.parameters)
      // eslint-disable-next-line max-statements
      .on('error', err => {
        debug(`Got error ${err}`);
        // eslint-disable-next-line functional/no-conditional-statements
        if (err instanceof SruSearchError) {
          debug(`This is a SruSearchError`);
        }
        try {
          if (expectedError) {
            expect(err.message).to.match(new RegExp(expectedError.error, 'u'));
            // eslint-disable-next-line functional/no-conditional-statements
            if (expectedError.expectedErrorInstance === 'SruSearchError') {
              debug(`This should be an ${expectedError.expectedErrorInstance}`);
              expect(err).to.be.instanceOf(SruSearchError);
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
        // eslint-disable-next-line functional/immutable-data
        records.push(record);
        try {
          expect(expectedRecords[recordCount]).to.equal(record);
          recordCount++; // eslint-disable-line no-plusplus
        } catch (err) {
          reject(err);
        }
      })
      .on('total', totalNumberOfRecords => {
        debug(`Got total: ${totalNumberOfRecords}`);
        try {
          expect(Number(expectedTotalCount)).to.equal(totalNumberOfRecords);
        } catch (err) {
          reject(err);
        }
      })

      // eslint-disable-next-line max-statements
      .on('end', nextOffset => {
        debug(`Got end, nextOffset: ${nextOffset}`);
        debug(`Fetched records: (${records.length}): ${JSON.stringify(records)}`);
        debug(`Expected records: (${expectedRecords.length}): ${JSON.stringify(expectedRecords)}`);
        expect(expectedRecords).to.eql(records);

        try {
          if (nextOffset) {
            debug('Got nextOffset');
            expect(Number(expectedNextOffset)).to.eql(nextOffset);
            return resolve();
          }

          /*
          // if (nextOffset === undefined) {
          //   expect(expectedNextOffset.to.eql('undefined'));
          //  return resolve();
          //}
          */

          if (nextOffset) { // eslint-disable-line functional/no-conditional-statements
            throw new Error(`Unexpected next offset: ${nextOffset}`);
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      });
  });
}

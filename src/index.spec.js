/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* SRU Javascript client library
*
* Copyright (C) 2015, 2017-2018, 2020 University Of Helsinki (The National Library Of Finland)
*
* This file is part of sru-client-js
*
* sru-client-js program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Lesser General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* sru-client-js is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Lesser General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*
* @licend  The above is the entire license notice
* for the JavaScript code in this file.
*
*/

import createClient from '.';
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

function callback({getFixture, defaultParameters, method, error}) {
  const expectedRecords = getFixture({components: ['expected-records.json'], reader: READERS.JSON});
  const expectedNextOffset = getFixture('expected-next-offset.txt');
  const expectedError = getFixture('expected-error.txt');
  const expectedTotalCount = getFixture('expected-total-count.txt');

  let recordCount = 0; // eslint-disable-line functional/no-let
  const records = []; // eslint-disable-line functional/no-let

  const client = createClient({...defaultParameters, url: 'http://foo.bar'});

  return new Promise((resolve, reject) => {
    client[method.name](method.parameters)
      .on('error', err => {
        debug(`Got error ${err}`);
        try {
          if (expectedError) {
            expect(err.message).to.match(new RegExp(expectedError, 'u'));
            return resolve();
          }

          throw new Error(`Unexpected error: ${error}`);
        } catch (err) {
          reject(err);
        }
      })
      .on('record', record => {
        debug(`Got record ${recordCount}: ${record}`);
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

          if (nextOffset) { // eslint-disable-line functional/no-conditional-statement
            throw new Error(`Unexpected next offset: ${nextOffset}`);
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      });
  });
}

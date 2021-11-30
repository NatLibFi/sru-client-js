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

import fetch from 'node-fetch';
import httpStatus from 'http-status';
import {EventEmitter} from 'events';
import {Parser as XMLParser, Builder as XMLBuilder} from 'xml2js';
import createDebugLogger from 'debug';
import {promisify} from 'util';

export class SruSearchError extends Error {}

const setTimeoutPromise = promisify(setTimeout); // eslint-disable-line

export const recordFormats = {
  object: 'object',
  string: 'string'
};

export default ({
  url: baseUrl,
  recordSchema: recordSchemaDefault,
  version = '2.0',
  maxRecordsPerRequest = 1000,
  recordFormat = recordFormats.string,
  retrieveAll = true
}) => {

  const debug = createDebugLogger('@natlibfi/sru-client');
  const debugData = debug.extend('data');

  debug(retrieveAll);
  const formatRecord = createFormatter();

  class Emitter extends EventEmitter {
    constructor(...args) {
      super(args);
    }
  }

  return {searchRetrieve};

  function searchRetrieve(query, {startRecord = 1, recordSchema: recordSchemaArg} = {}) {
    const recordSchema = recordSchemaArg || recordSchemaDefault;
    const iteration = 1;
    const emitter = new Emitter();

    iterate(startRecord, iteration);
    return emitter;

    async function iterate(startRecord, iteration) {
      try {
        await processRequest(startRecord);
      } catch (err) {
        debug(JSON.stringify(err));
        return emitter.emit('error', err);
      }

      // eslint-disable-next-line max-statements
      async function processRequest(startRecord) {
        const url = generateUrl({operation: 'searchRetrieve', query, startRecord, recordSchema, version, maximumRecords: maxRecordsPerRequest});
        debug(`Sending request-${iteration}: ${url.toString()}`);
        const response = await fetch(url);
        debugData(response.status);
        debugData(JSON.stringify(response));

        if (response.status === httpStatus.OK) {
          const {records, error, nextRecordOffset, totalNumberOfRecords} = await parsePayload(response);
          const numberOfRecords = Array.isArray(records) ? records.length : 0;
          const endRecord = isNaN(nextRecordOffset) ? totalNumberOfRecords : nextRecordOffset - 1;
          debug(`Request-${iteration} got records ${startRecord}-${endRecord} (${numberOfRecords}) out of total ${totalNumberOfRecords}.`);

          if (error) { // eslint-disable-line functional/no-conditional-statement
            debug(`SRU received error: ${error}`);
            throw new SruSearchError(error);
          }

          // eslint-disable-next-line functional/no-conditional-statement
          if (iteration === 1) {
            debugData(`Emitting total: ${totalNumberOfRecords}`);
            emitter.emit('total', totalNumberOfRecords);
          }

          if (records) {
            await emitRecords(records);

            if (typeof nextRecordOffset === 'number') {
              if (retrieveAll === true) {
                debug(`Continuing (retrieveAll is true) with next searchRetrive starting from ${nextRecordOffset}`);
                return iterate(nextRecordOffset, iteration + 1);
              }

              debug(`Stopping (retrievaAll is false), there are still records to retrieve starting from ${nextRecordOffset}`);
              return emitter.emit('end', nextRecordOffset);
            }

            debug(`Stopping, no more records to retrieve: ${nextRecordOffset}`);
            return emitter.emit('end');
          }


          return emitter.emit('end');
        }

        const {status} = response;
        const message = await response.text();
        debug(`SRU non-OK response status: ${status}, message: ${message} `);
        throw new Error(`Unexpected response ${status}: ${message}`);

        // eslint-disable-next-line max-statements
        async function parsePayload(response) {
          const payload = await parse();
          debugData(JSON.stringify(payload));
          const [error] = payload['zs:searchRetrieveResponse']?.['zs:diagnostics']?.[0]?.['diag:diagnostic']?.[0]?.['diag:message'] || [];

          if (error) {
            debug(`SRU response status was ${response.status}, but response contained an error ${error}`);
            return {error};
          }

          const totalNumberOfRecords = Number(payload['zs:searchRetrieveResponse']['zs:numberOfRecords'][0]);
          debug(`Total number of records: ${totalNumberOfRecords}`);

          if (totalNumberOfRecords === 0) {
            return {totalNumberOfRecords};
          }


          const records = payload['zs:searchRetrieveResponse']['zs:records'][0]['zs:record'];
          const lastOffset = Number(records.slice(-1)[0]['zs:recordPosition'][0]);

          if (lastOffset === totalNumberOfRecords) {
            return {records, totalNumberOfRecords};
          }

          return {records, nextRecordOffset: lastOffset + 1, totalNumberOfRecords};

          async function parse() {
            const payload = await response.text();

            return new Promise((resolve, reject) => {
              new XMLParser().parseString(payload, (err, obj) => {
                if (err) {
                  return reject(new Error(`Error parsing XML: ${err}, input: ${payload}`));
                }
                return resolve(obj);
              });
            });
          }
        }

        async function emitRecords(records, promises = []) {
          const [record] = records;

          if (record) {
            promises.push(formatAndEmitRecord(record['zs:recordData'][0])); // eslint-disable-line
            return emitRecords(records.slice(1), promises);
          }

          await Promise.all(promises);

          async function formatAndEmitRecord(record) {
            const formatedRecord = await formatRecord(record);
            emitter.emit('record', formatedRecord);
          }
        }

        function generateUrl(params) {
          const formatted = Object.entries(params)
            .filter(([, value]) => value)
            .reduce((acc, [key, value]) => ({...acc, [key]: value}), {});

          const searchParams = new URLSearchParams(formatted);
          return `${baseUrl}?${searchParams.toString()}`;
        }
      }
    }
  }

  function createFormatter() {
    if (recordFormat === recordFormats.object) {
      return data => data;
    }

    if (recordFormat === recordFormats.string) {
      const builder = new XMLBuilder({
        xmldec: {
          version: '1.0',
          encoding: 'UTF-8',
          standalone: false
        },
        renderOpts: {
          pretty: true,
          indent: '\t'
        }
      });

      return data => {
        const [[key, value]] = Object.entries(data);
        return builder.buildObject({[key]: value[0]});
      };
    }

    throw new Error(`Invalid record format: ${recordFormat}`);
  }
};

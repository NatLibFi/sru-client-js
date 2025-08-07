import httpStatus from 'http-status';
import {EventEmitter} from 'events';
import {Parser as XMLParser, Builder as XMLBuilder} from 'xml2js';
import createDebugLogger from 'debug';
import {promisify} from 'util';
import {MARCXML} from '@natlibfi/marc-record-serializers';

export class SruSearchError extends Error { }

const setTimeoutPromise = promisify(setTimeout); // eslint-disable-line

export const metadataFormats = {
  object: 'object',
  string: 'string',
  marcJson: 'marcJson'
};

export default ({
  url: baseUrl,
  recordSchema: recordSchemaDefault,
  version = '2.0',
  maxRecordsPerRequest = 1000,
  metadataFormat = metadataFormats.string,
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
        debug(`Sending request-${iteration}: ${url}`);
        const response = await fetch(url, {headers: {'Cache-control': 'max-age=0, must-revalidate'}});
        debugData(response.status);
        debugData(JSON.stringify(response));

        if (response.status === httpStatus.OK) {
          const {records, error, nextRecordOffset, totalNumberOfRecords} = await parsePayload(response);
          const numberOfRecords = Array.isArray(records) ? records.length : 0;
          const endRecord = isNaN(nextRecordOffset) ? totalNumberOfRecords : nextRecordOffset - 1;
          debug(`Request-${iteration} got records ${startRecord}-${endRecord} (${numberOfRecords}) out of total ${totalNumberOfRecords}.`);

          if (error) {
            debug(`SRU received error: ${error}`);
            throw new SruSearchError(error);
          }

          if (iteration === 1) {
            debugData(`Emitting total: ${totalNumberOfRecords}`);
            emitter.emit('total', totalNumberOfRecords);
          }

          if (records) {
            await emitRecords(records);

            if (typeof nextRecordOffset === 'number') {
              if (retrieveAll === true) {
                debug(`Continuing (retrieveAll is true) with next searchRetrieve starting from ${nextRecordOffset}`);
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

        async function parsePayload(response) {
          const payload = await parse();
          debugData(JSON.stringify(payload));
          const [error] = pathParser(payload, 'zs:searchRetrieveResponse/zs:diagnostics/0/diag:diagnostic/0/diag:message') || [];

          if (error) {
            debug(`SRU response status was ${response.status}, but response contained an error ${error}`);
            return {error};
          }

          const totalNumberOfRecords = Number(pathParser(payload, 'zs:searchRetrieveResponse/zs:numberOfRecords/0'));
          debug(`Total number of records: ${totalNumberOfRecords}`);

          if (totalNumberOfRecords === 0) {
            return {totalNumberOfRecords};
          }

          const records = pathParser(payload, 'zs:searchRetrieveResponse/zs:records/0/zs:record') || [];
          const lastOffset = Number(pathParser(records.slice(-1), '0/zs:recordPosition/0'));

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
          const [record, ...rest] = records;

          if (record !== undefined) {
            promises.push(formatAndEmitRecord(pathParser(record, 'zs:recordData/0')));
            return emitRecords(rest, promises);
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

        // namespace-agnostic json-like query of the json data
        // returns undefined if the path cannot be resolved
        // requires that the segments in the path are always namespaced
        function pathParser(value, path) {
          const pathArray = `${path}`.split('/');

          return parse(pathArray, value);

          function parse(pathArray, value) {
            const [pathPart, ...restOfPathArray] = pathArray;
            if (pathPart === undefined) {
              return value;
            }

            if (value && typeof value === 'object') {
              if (pathPart in value) {
                return parse(restOfPathArray, value[pathPart]);
              }

              const [, tag] = pathPart.split(':');
              if (tag in value) {
                return parse(restOfPathArray, value[tag]);
              }

              return undefined;
            }

            return pathParser(restOfPathArray, value);
          }
        }
      }
    }
  }

  function createFormatter() {
    if (metadataFormat === metadataFormats.object) {
      return metadata => metadata;
    }

    if (metadataFormat === metadataFormats.string) {
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

      return metadata => {
        const [[key, value]] = Object.entries(metadata);
        return builder.buildObject({[key]: value[0]});
      };
    }

    if (metadataFormat === metadataFormats.marcJson) {
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

      return async metadata => {
        const [[key, value]] = Object.entries(metadata);
        const xmlString = builder.buildObject({[key]: value[0]});
        const record = await MARCXML.from(xmlString, {subfieldValues: false});
        return record;
      };
    }

    throw new Error(`Invalid record format: ${metadataFormat}`);
  }
};

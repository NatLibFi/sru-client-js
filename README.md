# SRU Javascript client library [![NPM Version](https://img.shields.io/npm/v/@natlibfi/sru-client.svg)](https://npmjs.org/package/@natlibfi/sru-client)

This library implements a client to retrieve records via [Search/Retrieve via URL (SRU)](http://www.loc.gov/standards/sru/) API.

# Usage

## Retrieve all records

```js
import createClient from '@natlibfi/sru-client';
const client = createClient({url: 'https://foo.bar', recordSchema: 'marcxml'});

client.searchRetrieve('foo')
  .on('record', record => processRecord(string))
  .on('total', totalNumberOfRecords => doSomething(totalNumberOfRecords))
  .on('end', () => endProcessing())
  .on('error', err => handleError(err));
```

## Retrieve records only from the first response

```js
import createClient from '@natlibfi/sru-client';
const client = createClient({url: 'https://foo.bar', recordSchema: 'marcxml', retrieveAll: false});

client.searchRetrieve('foo')
  .on('record', record => processRecord(record))
  .on('total', totalNumberOfRecords => doSomething(totalNumberOfRecords))
  .on('end', nextRecordOffset => endProcessing(nextRecordOffset))
  .on('error', err => handleError(err));
```

## Retrieve total amount of records

```js
import createClient from '@natlibfi/sru-client';
const client = createClient({url: 'https://foo.bar', recordSchema: 'marcxml', maxRecordsPerRequest: 0, retrieveAll: false});

client.searchRetrieve('foo')
  .on('total', totalNumberOfRecords => doSomething(totalNumberOfRecords))
  .on('end', () => endProcessing())
  .on('error', err => handleError(err));
```

# Configuration

## Client creation options

- **url**: The URL of the SRU service.
- **recordSchema**: Schema of the records. **Mandatory**.
- **version**: SRU version. Defaults to **2.0**.
- **maxRecordsPerRequest**: Maximum number of records to retrieve per requests. Defaults to **1000**. If maxRecordsPerRequest is set to **0** search does not retrieve any records. The **total** event returns still the total number of records available for search.
- **recordFormat**: Format of the record argument in **record** event. Can be `string` (default) or `object` (XML parsed by [xml2js](https://www.npmjs.com/package/xml2js)).
- **retrieveAll**: Whether to retrieve all records or just from the first response. If **false**, the **end** event return the offset of the next record for the query. The **total** event returns still the total number of records available for search.

## searchRetrieve options:

The first parameter is the mandatory CQL query string. Second is an optional object which supports the following properties:

- **startRecord**: The offset of the record from which to start fetching results from. See **retrieveAll** of the client creation options.
- **recordSchema**: Override default record schema

# Notes

- The **totalNumberOfRecords** returned by the **total** event is limited to the maximum number of records provided by server. Ie. if the SRU servers limit for search and retrieve is 20 000 records, 20 000 is the maximum totalNumberOfRecords available, even if the server's database actually contains more records matching the query.
- The library uses module [debug](https://www.npmjs.com/package/debug) to optionally emit debugging information.

- Cli use needs enviroment variable SRU_URL

## License and copyright

Copyright (c) 2015, 2017-2018, 2020-2025 **University Of Helsinki (The National Library Of Finland)**

This project's source code is licensed under the terms of **MIT**.

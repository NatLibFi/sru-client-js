# SRU client for Node.js and browser [![NPM Version](https://img.shields.io/npm/v/@natlibfi/sru-client.svg)](https://npmjs.org/package/@natlibfi/sru-client) [![Build Status](https://travis-ci.org/NatLibFi/sru-client.svg)](https://travis-ci.org/NatLibFi/sru-client)

SRU client for Node.js and browser

## Usage
### ES modules
```js
import createSruClient from '@natlibfi/sru-client';
const client = createSruClient({url: 'https://foo.bar'});

client.searchRetrieve('foo')
  .on('record', xmlString => processRecord(xmlString))
  .on('end', () => endProcessing())
  .on('error', err => handleError(err));
```
### Node
```js
const createSruClient = require('@natlibfi/sru-client').default;
const client = createSruClient({url: 'https://foo.bar'});

client.searchRetrieve('foo')
  .on('record', xmlString => processRecord(xmlString))
  .on('end', () => endProcessing())
  .on('error', err => handleError(err));
```

## License and copyright

Copyright (c) 2015, 2017-2018 **University Of Helsinki (The National Library Of Finland)**

This project's source code is licensed under the terms of **GNU Lesser General Public License Version 3** or any later version.

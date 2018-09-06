# SRU client for Node.js and browser [![NPM Version](https://img.shields.io/npm/v/@natlibfi/sru-client.svg)](https://npmjs.org/package/@natlibfi/sru-client) [![Build Status](https://travis-ci.org/NatLibFi/sru-client.svg)](https://travis-ci.org/NatLibFi/sru-client)

SRU client for Node.js and browser

With this feature branch you can choose between title, creator or the query parameter for querying a SRU endpoint. 

## Usage
### Node
```js
var sruClient = new SRU({serverUrl: 'http://bvbr.bib-bvb.de:5661/bvb01sru', version: "1.1", maximumRecords : 100, recordSchema : "marcxml"});
results = sruClient.searchRetrieve({title : encodeURIComponent(string)});
```

## License and copyright

Copyright (c) 2015, 2017-2018 **University Of Helsinki (The National Library Of Finland)**
Copyright (C) 2018 Florian Fritze **Stuttgart University Library**

This project's source code is licensed under the terms of **GNU Lesser General Public License Version 3** or any later version.

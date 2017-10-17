/**
 *
 * @licstart  The following is the entire license notice for the JavaScript code in this file. 
 *
 * SRU (Search/Retrieval via URL) Javascript client library and command-line interface
 *
 * Copyright (c) 2015,2017 University Of Helsinki (The National Library Of Finland)
 *
 * This file is part of sru-client
 *
 * sru-client is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * @licend  The above is the entire license notice
 * for the JavaScript code in this page.
 *
 **/

(function (root, factory) {

    'use strict';

    if (typeof define === 'function' && define.amd) {
	define(['chai', 'chai-as-promised', '../lib/main'], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('chai'), require('chai-as-promised'), require('../lib/main'));
    }

}(this, factory));

function factory(chai, chaiAsPromised, getSruClient)
{

    'use strict';

    var should = chai.should();
    
    chai.use(chaiAsPromised);

    describe('cli', function() {});

}
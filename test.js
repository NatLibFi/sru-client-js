import createModule from './dist/index';

start ();
async function start() {
  const client = createModule({serverUrl: 'http://melinda-test.kansalliskirjasto.fi:210/fin01'});
  const results = await client.searchRetrieve('foobar');
  console.log(results);
  console.log(results.length);
}

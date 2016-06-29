var BASES = (process.env.BASES || process.argv[2] || '').split(',')

require('seneca')({
  tag: 'entry-store',
  log: { level: 'none' },
  internal: { logger: require('seneca-demo-logger') },
  debug: {short_logs:true}
})
  .use('entity')
  .use('entry-store-logic')
  .use('mesh',{
    pin: 'store:*,kind:entry', 
    bases: BASES
  })
  .ready(function(){
    console.log(this.id)
  })

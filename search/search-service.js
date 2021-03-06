"use strict"

var PORT = process.env.PORT || process.argv[2] || 0
var HOST = process.env.HOST || process.argv[3] || 0
var BASES = (process.env.BASES || process.argv[4] || '').split(',')
var SILENT = process.env.SILENT || process.argv[5] || 'true'


var hapi       = require('hapi')
var chairo     = require('chairo')
var vision     = require('vision')
var inert      = require('inert')
var handlebars = require('handlebars')
var _          = require('lodash')
var moment     = require('moment')
var Seneca     = require('seneca')
var Rif        = require('rif')


var server = new hapi.Server()
var rif = Rif()


var host = rif(HOST) || HOST


server.connection({
    port: PORT,
    host: host
})


server.register( vision )
server.register( inert )

server.register({
  register:chairo,
  options:{
    seneca: Seneca({
      tag: 'search',
      internal: {logger: require('seneca-demo-logger')},
      debug: {short_logs:true}
    })
	  //.use('zipkin-tracer', {sampling:1})
  }
})

server.register({
  register: require('wo'),
  options:{
    bases: BASES,
    route: [
        {method: ['GET','POST'], path: '/search/{user}'},
    ],
    sneeze: {
      host: host,
      silent: JSON.parse(SILENT)
    }
  }
})


server.views({
  engines: { html: handlebars },
  path: __dirname + '/www',
  layout: true
})


server.route({
  method: ['GET','POST'],
  path: '/search/{user}',
  handler: function( req, reply )
  {
    var query
      = (req.query ? (null == req.query.query ? '' : ' '+req.query.query) : '')
      + (req.payload ? (null == req.payload.query ? '' : ' '+req.payload.query) : '')

    query = query.replace(/^ +/,'')
    query = query.replace(/ +$/,'')

    server.seneca.act(
      'follow:list,kind:following',
      {user:req.params.user},
      function(err,following){
        if( err ) {
          following = []
        }

        this.act(
          'search:query',
          {query: query },
          function( err, entrylist ) {
            if(err) {
              this.log.warn(err)
              entrylist = []
            }

            reply.view('search',{
              query: encodeURIComponent(query),
              user: req.params.user,
              entrylist: _.map(entrylist,function(entry){
                entry.when = moment(entry.when).fromNow()
                entry.can_follow =
                  req.params.user != entry.user &&
                  !_.includes(following,entry.user)
                return entry
              })
            })
          })
      })
  }
})


server.seneca.use('mesh',{
  bases:BASES,
  host:host,
  sneeze:{
    silent: JSON.parse(SILENT),
    swim: {interval: 1111}
  }
})

server.start(function(){
  console.log('search',server.info.uri)
})


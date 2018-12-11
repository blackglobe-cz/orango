require('app-module-path').addPath(__dirname)
const orango = require('orango')
const readFiles = require('./helpers/readFiles')
const pluralize = require('pluralize')
const { Builder } = require('tangjs/lib')
const { filterToAQL } = orango.helpers
require('colors')

const AQB = orango.AQB

let query = {
  method: 'find',
  model: 'Tweet',
  alias: 'tweeter',
  filter: {
    $or: [
      {
        active: true
      },
      {
        created: {
          $lte: Date.now()
        }
      }
    ]
  },
  limit: 10,
  offset: 1,
  select: 'text',
  methods: [
    {
      method: 'findOne',
      model: 'User',
      alias: 'fred',
      merge: true,
      filter: {
        _key: '@{tweeter.user}',
        active: true
      },
      select: 'firstName lastName'
      // return: { // cannot use return with merge
      //   computed: true,
      // }
    },
    {
      model: 'Comment',
      alias: 'comment',
      appendAs: 'comments',
      filter: {
        _key: '@{tweeter.user}'
      },
      limit: 10,
      methods: [
        {
          method: 'findOne',
          model: 'User',
          alias: 'user',
          filter: {
            _key: '@{comment.user}'
          },
          select: 'firstName lastName',
          return: {
            id: true,
            computed: true
          }
        }
      ],
      return: {
        id: true,
        computed: true
      }
    }
  ],
  return: {
    id: true,
    computed: true,
    // toModel: true
  }
}

function isOne(method) {
  switch (method) {
    case 'findOne':
    case 'updateOne':
    case 'deleteOne':
      return true
  }
  return false
}

async function execQuery(data) {
  let q = await Builder.getInstance()
    .data(data)
    .convertTo(orango.Query)
    .toObject({
      computed: true,
      scope: true // invokes required
    })
    .build()

  let result = parseQuery(q)
  console.log(result.toAQL().green)
}

function parseQuery(data) {
  if (data.method === 'findOne') {
    data.limit = 1
  }
  let ModelCls = orango.model(data.model)
  let col = ModelCls.collectionName

  if (data.alias === col) {
    throw new Error('The property "alias" cannot be the same name as collection: ' + col)
  }

  let name = data.alias || pluralize.singular(col)
  let aql = AQB.for(name).in(col)

  let result = name
  if (data.select) {
    let select = data.select.split(' ')
    for (let i = 0; i < select.length; i++) {
      select[i] = AQB.str(select[i])
    }
    result = AQB.KEEP(name, select)
  }

  if (data.filter) {
    let filterAQL = filterToAQL(data.filter, name)
    aql = aql.filter(AQB.expr(filterAQL))
    if (data.offset && data.limit) {
      aql = aql.limit(data.offset, data.limit)
    } else if (data.offset) {
      aql = aql.limit(data.offset, 10)
    } else if (data.limit) {
      aql = aql.limit(data.limit)
    }
  }

  // dummy
  // these are just properties???
  // let merges = ['junk', 'test']
  let merges = []
  // these are populates
  let appends = []

  if (data.methods) {
    for (let pop of data.methods) {
      let PopModelCls = orango.model(pop.model)
      let popName = pop.alias || PopModelCls.collectionName
      if (isOne(pop.method)) {
        aql = aql.let(popName, AQB.FIRST(parseQuery(pop)))
      } else {
        aql = aql.let(popName, parseQuery(pop))
      }

      if (pop.merge) {
        merges.push(popName)
      } else {
        appends.push({
          key: pop.appendAs || popName,
          value: popName
        })
      }
    }
  }

  let appendData = {}
  for (let i = 0; i < appends.length; i++) {
    appendData[appends[i].key] = appends[i].value
  }

  if (appends.length && merges.length) {
    result = AQB.MERGE(result, AQB.expr(merges.join(', ')), appendData)
  } else if (merges.length) {
    result = AQB.MERGE(result, AQB.expr(merges.join(', ')))
  } else if (appends.length) {
    result = AQB.MERGE(result, appendData)
  }

  aql = aql.return(result)
  return aql
}

async function main() {
  readFiles('models')

  query = {
    method: 'findOne',
    model: 'Identity',
    alias: 'id',
    filter: {
      identifier: 'roboncode@gmail.com'
    },
    methods: [
      {
        method: 'findOne',
        model: 'User',
        appendAs: 'user',
        filter: {
          _key: '@{id.user}'
        }
      }
    ],
    return: {
      id: true,
      computed: true,
      // toModel: true
    }
  }
  
  await execQuery(query)
}

// TODO: This will be used to modify results
let modifier = {
  single: true,
  model: 'Identity',
  return: {
    id: true,
    computed: true
  },
  children: [
    {
      prop: 'user',
      single: true,
      model: 'User',
      return: {
        id: true,
        computed: true
      }
    }
  ]
}

main()
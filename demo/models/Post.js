const arango = require('../../arango')

let schema = arango.Schema({
  title: String,
  content: String
}, {
  strict: true
})
module.exports = arango.model('Post', schema)
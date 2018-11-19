---
pageClass: api
---

# ORM

ORM methods can be daisy-chained. To invoke the query builder, you can wither use `await` or invoke `exec()`.

## computed

`Method` Returns document with computed properties. Computed properties are virtual properties that are not stored in the database.

```js
const UserSchema = orango.Schema({
  firstName: String,
  lastName: String,
})

UserSchema.computed.fullName = function () {
  return this.firstName + ' ' + this.lastName
}

orango.model('User', UserSchema)

...

let user = await User.findById('9876').computed()
// { _key: '9876', firstName: 'Sample', lastName: 'User', fullName: 'Sample User' }
```

## id

`Method` Replaces _key with `id` property.

```js
let user = await User.findOne({ email: 'user@sample.com' }).id()
// User { id: '9876', name: 'Sample User", email: 'user@sample.com' }
```

## limit

`Method` Limits the return results. Oftentimes, this will be paired with `offset()`

```js
await User.find({ active: true }).limit(10)
```

## offset

`Method` Skips the documents by the offset provided. Oftentimes, this will be paired with `limit()`

```js
await User.find({ active: true }).offset(10)
```


## return

`Method` See [CONSTS.RETURN](http://localhost:8080/api/consts.html#return)

### Returning docs as models on find()

```js
let user = await User.findOne({ email: 'user@sample.com' }).return(RETURN.MODEL)
// User { _key: '9876', name: 'Sample User", email: 'user@sample.com' }
```

### Return new, old, or both on update()

```js
let user = User.updateOne({ 
  email: 'user@sample.com' 
}, { 
  email: 'user@demo.com' 
}).return(RETURN.NEW_MODEL)
// User { _key: '9876', name: 'Sample User", email: 'user@demo.com' }
```

## toAQL

`Method` Returns the AQL query generated by the ORM

```js
let aql = async User.updateOne({ email: 'user@sample.com' }).toAQL()
```

## withDefaults

`Method` This is only used when creating a new document. It will insert the document with the 
default values declared in the model. Default values will not be included if this function
is not invoked.

```js
const User = orango.model('User', {
  active: { type: Boolean, default: true },
  name: String,
  email: String,
})

...

let user = new User({ name: 'Sample User', email: 'user@sample.com' })
await user.save().withDefaults()
// { _key: '9876', active: true, name: 'Sample User', email: 'user@sample.com' }
```
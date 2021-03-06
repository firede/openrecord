var path = require('path')
var Store = require('../../../store')

module.exports = function(title, beforeFn, afterFn, storeConf) {
  describe(title + ': Migrations', function() {
    var store

    before(beforeFn)
    after(function(next) {
      afterFn(next, store)
    })

    before(function() {
      storeConf.migrations = path.join(
        __dirname,
        '..',
        '..',
        'fixtures',
        'migrations',
        '*'
      )
      storeConf.plugins = require('../../../lib/base/dynamic_loading')

      store = new Store(storeConf)

      store.Model('User', function() {})
      store.Model('Post', function() {})
      store.Model('Test', function() {})
      store.Model('AttributeTest', function() {})
    })

    it('second migrations was executed as well', function() {
      return store.ready(function() {
        var Post = store.Model('Post')

        Post.definition.attributes.should.have.property('id')
        Post.definition.attributes.should.have.property('message')
      })
    })

    it('has the right data type', function() {
      return store.ready(function() {
        var AttributeTest = store.Model('AttributeTest')
        AttributeTest.definition.attributes.string_attr.type.name.should.be.equal(
          'string'
        )
        AttributeTest.definition.attributes.text_attr.type.name.should.be.equal(
          'string'
        )
        AttributeTest.definition.attributes.integer_attr.type.name.should.be.equal(
          'integer'
        )
        AttributeTest.definition.attributes.float_attr.type.name.should.be.equal(
          'float'
        )
        AttributeTest.definition.attributes.boolean_attr.type.name.should.be.equal(
          'boolean'
        )
        AttributeTest.definition.attributes.date_attr.type.name.should.be.equal(
          'date'
        )
        AttributeTest.definition.attributes.datetime_attr.type.name.should.be.equal(
          'datetime'
        )

        if (store.type === 'postgres' || store.type === 'mysql') {
          AttributeTest.definition.attributes.binary_attr.type.name.should.be.equal(
            'binary'
          )
          AttributeTest.definition.attributes.time_attr.type.name.should.be.equal(
            'time'
          )
        } else {
          AttributeTest.definition.attributes.binary_attr.type.name.should.be.equal(
            'string'
          ) // TODO: SHOULD BE binary
          AttributeTest.definition.attributes.time_attr.type.name.should.be.equal(
            'string'
          ) // TODO: SHOULD BE time
        }
      })
    })

    it('has created a view', function() {
      return store.ready(function() {
        var Test = store.Model('Test')
        return Test.find(1).exec(function(user) {
          user.login.should.be.equal('phil')
        })
      })
    })

    it('has seeded some records', function() {
      return store.ready(function() {
        var User = store.Model('User')

        return User.find(1).exec(function(user) {
          user.login.should.be.equal('phil')
        })
      })
    })
  })
}

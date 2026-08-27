/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4287850865")
  const field = collection.fields.getByName("type")
  field.values = ["notes", "thinkings", "xiaoji"]
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4287850865")
  const field = collection.fields.getByName("type")
  field.values = ["notes", "thinkings"]
  return app.save(collection)
})

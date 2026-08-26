/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "help": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text724990059",
        "max": 0,
        "min": 0,
        "name": "title",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text2560465762",
        "max": 0,
        "min": 0,
        "name": "slug",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select2363381545",
        "maxSelect": 1,
        "name": "type",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "notes",
          "thinkings"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "select2063623452",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "draft",
          "published",
          "archived"
        ]
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text245846248",
        "max": 0,
        "min": 0,
        "name": "label",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text3458754147",
        "max": 0,
        "min": 0,
        "name": "summary",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text4274335913",
        "max": 0,
        "min": 0,
        "name": "content",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "date3085063276",
        "max": "",
        "min": "",
        "name": "publishedAt",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "help": "",
        "hidden": false,
        "id": "date1549119089",
        "max": "",
        "min": "",
        "name": "editedAt",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "help": "",
        "hidden": false,
        "id": "file2366146245",
        "maxSelect": 1,
        "maxSize": 0,
        "mimeTypes": [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
          "image/svg+xml"
        ],
        "name": "cover",
        "presentable": false,
        "protected": false,
        "required": false,
        "system": false,
        "thumbs": [
          "1200x0"
        ],
        "type": "file"
      },
      {
        "help": "",
        "hidden": false,
        "id": "file1204091606",
        "maxSelect": 20,
        "maxSize": 0,
        "mimeTypes": [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
          "image/svg+xml"
        ],
        "name": "attachments",
        "presentable": false,
        "protected": false,
        "required": false,
        "system": false,
        "thumbs": [
          "1200x0"
        ],
        "type": "file"
      }
    ],
    "id": "pbc_4287850865",
    "indexes": [
      "CREATE UNIQUE INDEX `idx_articles_type_slug` ON `articles` (`type`, `slug`)"
    ],
    "listRule": "status = \"published\" || @request.auth.id != \"\" && @request.auth.collectionId = \"pbc_3924173833\"",
    "name": "articles",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": "status = \"published\" || @request.auth.id != \"\" && @request.auth.collectionId = \"pbc_3924173833\""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4287850865");

  return app.delete(collection);
})

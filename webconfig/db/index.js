const MongoClient = require('mongodb').MongoClient;

class DBclient {
    constructor() {
        this.mongoDb = null;
        this.mongoTable = null;
        // this.connect()
    }

    async connect(collection_name) {
        const connect = new Promise((resolve, reject) => {
            MongoClient.connect("mongodb://127.0.0.1:27017", (err, client) => {
                if (err) throw err;
                this.mongoDb = client;
                this.mongoTable = client.db('test').collection(collection_name);
                resolve(this.mongoTable);
            });
        })
        return connect;
    }

    find() {
        console.log(this.mongoTable)
            // this.mongoTable.find({}).toArray((err, items) => {
            //     console.log(err, items)
            // });
    }
}

module.exports = DBclient;
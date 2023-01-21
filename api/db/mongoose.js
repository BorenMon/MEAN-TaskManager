// This file will handle connection logic with MongoDB database

const mongoose = require('mongoose')

mongoose.Promise = global.Promise
mongoose.connect('mongodb://localhost:27017/task-manager', { useNewUrlParser: true }).then(() => {
  console.log('Connected to MongoDB')
}).catch(e => {
  console.log('Error while attempting to connect to MongoDB')
  console.log(e)
})

module.exports = mongoose
const { default: mongoose } = require('mongoose')
const mongooose = require('mongoose')
const _ = require('lodash')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')

// JWT Secret
const jwtSecret = "05266886520976829471skajdhkhjsdfas7046993034"

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    minlength: 1,
    trim: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  sessions: [{
    token: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Number,
      required: true
    }
  }]
})

// Instance methods
UserSchema.methods.toJSON = function() {
  const user = this
  const userObject = user.toObject()

  // return the document exept the password and sessions 
  return _.omit(userObject, ['password', 'sessions'])
}

UserSchema.methods.generateAccessAuthToken = function() {
  const user = this
  return new Promise((resolve, reject) => {
    // Create the JSON Web Token and return it
    jwt.sign({ _id: user._id.toHexString()}, jwtSecret, {expiresIn: "10s"}, (err, token) => {
      if(!err){
        resolve(token)
      } else {
        reject()
      }
    })
  })
}

UserSchema.methods.generateRefreshAuthToken = function(){
  // This method simply generates a 64bytes hex string - it doen't save it to databaase. svaeSessionToDatabase() does that.
  return new Promise((resolve, reject) => {
    crypto.randomBytes(64, (err, buffer) => {
      if(!err){
        const token = buffer.toString('hex')

        return resolve(token)
      }
    })
  })
}

UserSchema.methods.createSession = function() {
  const user = this

  return user.generateRefreshAuthToken().then(refreshToken => {
    return saveSessionToDatabase(user, refreshToken)
  }).then(refreshToken => {
    // saved to database successfully
    // Now return the refresh token
    return refreshToken
  }).catch(e => {
    return Promise.reject('Failed to save session to database.\n' + e)
  })
}

// Model Methods (Static Methods)

UserSchema.statics.getJWTSecret = () => {
  return jwtSecret
}

UserSchema.statics.findByIdAndToken = function(_id, token) {
  // Find user by id and token
  // Use in auth middleware (verifySession)

  const user = this
  return user.findOne({
    _id,
    'session.token': token
  })
}

UserSchema.statics.findByCredentials = function(email, password) {
  const user = this
  return user.findOne({email}).then(user => {
    if(!user) return Promise.reject()
    return new Promise((resolve, reject) => {
      bcrypt.compare(password, user.password, (err, res) => {
        if(res) resolve(user)
        else reject()
      })
    })
  })
}

UserSchema.statics.hasRefreshTokenExpired = expiresAt => {
  const secondsSinceEpoch = Date.now() / 1000
  if(expiresAt > secondsSinceEpoch){
    // hasn't expired
    return false
  } else {
    // has expired
    return true
  }
}

// Middleware
// Before a user document is saved, this code runs
UserSchema.pre('save', function(next) {
  const user = this
  const costFactor = 10

  if(user.isModified('password')) {
    // if the password field has been edited/changed then run this code

    // Generate salt and hash password
    bcrypt.genSalt(costFactor, (err, salt) => {
      bcrypt.hash(user.password, salt, (err, hash) => {
        user.password = hash
        next()
      })
    })
  } else {
    next()
  }
})

// Helper Methods
const saveSessionToDatabase = (user, refreshToken) => {
  // Save session to database
  return new Promise((resolve, reject) => {
    const expiresAt = generateRefreshTokenExpiryTime()

    user.sessions.push({ 'token': refreshToken, expiresAt})

    user.save().then(() => {
      // save session successfully
      return resolve(refreshToken)
    }).catch(e => {
      reject(e)
    })
  })
}

const generateRefreshTokenExpiryTime = () => {
  const daysUntilExpire = 10
  const secondsUnitlExpire = daysUntilExpire * 24 * 60 * 60
  // const secondsUnitlExpire = 15
  return Date.now() / 1000 + secondsUnitlExpire
}

const User = mongoose.model('User', UserSchema)

module.exports = User
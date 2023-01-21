const express = require('express')
const app = express()

const mongoose = require('./db/mongoose')

// Load mongoose models
const { List, Task, User } = require('./db/models')
const jwt = require('jsonwebtoken')

/* MIDDLEWARE */

// Load middleware
app.use(express.json())

// CORS Header Middleware
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "DELETE, POST, GET, OPTIONS, PATCH")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-access-token, x-refresh-token, _id");

  res.header(
    'Access-Control-Expose-Headers',
    'x-access-token, x-refresh-token'
  )

  next();
});

// check wether the request has a valid JWT access token
const authenticate = (req, res, next) => {
  // let token = req.headers.authorization.split(' ')[1]
  let token = req.header('x-access-token')

  // verify the JWT
  jwt.verify(token, User.getJWTSecret(), (err, decoded) => {
    if(err){
      // there was an error
      // jwt is invalid - * DO NOT AUTHENTICATE *
      res.status(401).send(err)
    } else {
      // jwt is valid
      req.user_id = decoded._id
      next()
    }
  })
}

// Verify Refresh Token Middleware (which will be verifying th session)
const verfiySession = (req, res, next) => {
  // grab the refresh token from the request header
  const refreshToken = req.header('x-refresh-token')

  // grab the _id from the request header
  const _id = req.header('_id')

  User.findByIdAndToken(_id, refreshToken).then(user => {
    if(!user) {
      // user couldn't be found
      return Promise.reject({
        'error': 'User not found. Make sure that the refresh token and user id are correct'
      })
    }

    // if the code reaches here - the user was found
    // therefore the refresh token exists in the database - but we still have to check if it has expired or not

    req.user_id = user._id
    req.userObject = user
    req.refreshToken = refreshToken

    let isSessionValid = false

    user.sessions.forEach(session => {
      if(session.token === refreshToken) {
        // Check if the session has expired
        if(User.hasRefreshTokenExpired(session.expiresAt) === false){
          // refresh token hasn't expired
          isSessionValid = true
        }
      }
    })

    if(isSessionValid) next()
    else {
      // the session is not valid
      return Promise.reject({
        'error': 'Refresh token has expired or the session is invalid'
      })
    }
  }).catch(e => {
    res.status(401).send(e)
  })
}

/* END MIDDLEWARE */

// Route Handlers

// List Routes

/**
 * GET /lists
 * Purpose: Get all lists
 */
app.get('/lists', authenticate, (req, res) => {
  // We want to return an array of all lists that belong to authenticated user
  List.find({
    _userId: req.user_id
  }).then(lists => {
    res.send(lists)
  }).catch(e => {
    res.send(e)
  })
})

/**
 * POST /lists
 * Purpose: Create a list
 */
app.post('/lists', authenticate, (req, res) => {
  // We want to create a new list and return the new list document back to the user (which includes the id)
  // The list information (fields) will be passed in via the JSON request body
  let title = req.body.title

  let newList = new List({
    title,
    _userId: req.user_id
  })
  newList.save().then(listDoc => {
    // The full list document is returned (include id)
    res.send(listDoc)
  })
})

/**
 * PUT /lists/:id
 * Purpose: Update a specific list
 */
app.patch('/lists/:id', authenticate, (req, res) => {
  // We want to update the specific list (list document with id in URL) with the new values specified in JSON body of the request
  List.findOneAndUpdate({ _id: req.params.id, _userId: req.user_id }, {
    $set: req.body
  }).then(() => {
    res.sendStatus(200)
  })
})

/**
 * DELETE /lists/:id
 * Purpose: Delete a specific list
 */
app.delete('/lists/:id', authenticate, (req, res) => {
  // We want to delete the specific list (document with id URL)
  List.findOneAndRemove({ 
    _id: req.params.id,
    _userId: req.user_id 
  }).then(removedListDoc => {
    res.send(removedListDoc)

    // delete all the tasks that are in the deleted list
    deleteTasksFromList(removedListDoc._id)

  })
})

/**
 * GET /lists/lists/:listId/tasks
 * Purpose: Get all tasks in a specific list
 */
app.get('/lists/:listId/tasks', authenticate, (req, res) => {
  // We want to return all tasks that belong to a specific list (specified by listId)
  Task.find({
    _listId: req.params.listId
  }).then(tasks => {
    res.send(tasks)
  })
})

/**
 * POST /lists/:listId/tasks
 * Purpose: Create a new task in a specific list
 */
app.post('/lists/:listId/tasks', authenticate, (req, res) => {
  // We want to create a new task in a list specified by listId

  List
  .findOne({
    _id: req.params.listId,
    _userId: req.user_id
  })
  .then(list => {
    if(list) {
      // list object with the specified conditions was found
      // therefore the current authentixated list can create new tasks
      return true
    }
    // else - the list object is undefined
    return false
  })
  .then(canCreateTask => {
    if(canCreateTask) {
      const newTask = new Task({
        title: req.body.title,
        _listId: req.params.listId
      })
      newTask.save().then(newTaskDoc => {
        res.send(newTaskDoc)
      })
    } else {
      res.sendStatus(404)
    }
  })
})

// app.get('/lists/:listId/tasks/:taskId', (req, res) => {
//   // We want to return specific task
//   Task.findOne({
//     _id: req.params.taskId,
//     _listId: req.params.listId
//   }).then(task => {
//     res.send(task)
//   })
// })

/**
 * PATCH /lists/:listId/tasks/:taskId
 * Purpose: Update a task in a specific list
 */
app.patch('/lists/:listId/tasks/:taskId', authenticate, (req, res) => {
  // We want to update a task in a list

  List
  .findOne({
    _id: req.params.listId,
    _userId: req.user_id
  })
  .then(list => {
    if(list) {
      // list object with the specified conditions was found
      // therefore the current authentixated list can update the specified tasks
      return true
    }
    // else - the list object is undefined
    return false
  })
  .then(canUpdateTask => {
    if(canUpdateTask) {
      // the current authenticated user can update tasks
      Task.findOneAndUpdate({
        _listId: req.params.listId,
        _id: req.params.taskId
      }, {
        $set: req.body
      }).then(() => {
        res.send({ message: 'Updated successfully' })
      })
    } else {
      res.sendStatus(404)
    }
  })
})

/**
 * DELETE /lists/:listId/tasks/:taskId
 * Purpose: Delete a task in a specific list
 */
app.delete('/lists/:listId/tasks/:taskId', authenticate, (req, res) => {
  // We want to delete a task in a list
  List
  .findOne({
    _id: req.params.listId,
    _userId: req.user_id
  })
  .then(list => {
    if(list) {
      // list object with the specified conditions was found
      // therefore the current authentixated list can delete the specified task
      return true
    }
    // else - the list object is undefined
    return false
  })
  .then(canDeleteTask => {
    if(canDeleteTask) {
      // the current authenticated user can delete task
      Task.findOneAndRemove({
        _listId: req.params.listId,
        _id: req.params.taskId
      }).then(removed => {
        res.send(removed)
      })
    } else {
      res.sendStatus(404)
    }
  })
})

// User Routes

/**
 * POST /users
 * Purpose: Sign Up
 */
app.post('/users', (req, res) => {
  // User sign up

  const body = req.body
  const newUser = new User(body)

  newUser.save().then(() => {
    return newUser.createSession()
  }).then(refreshToken => {
    // Session create succesfully - refreshToken returned
    // now we generate an access auth token for the user

    return newUser.generateAccessAuthToken().then(accessToken => {
      // access auth token generate succesfully, now we return an object containing the auth tokens
      return {accessToken, refreshToken}
    })
  }).then((authTokens) => {
    // Now we construct and send the response to the user with their auth tokens in the header and the user object in the body

    res
        .header('x-refresh-token', authTokens.refreshToken)
        .header('x-access-token', authTokens.accessToken)
        .send(newUser)
  }).catch(e => {
    res.status(400).send(e)
  })
})

/**
 * POST / users/login
 * Purpose: Login
 */
app.post('/users/login', (req, res) => {
  const email = req.body.email
  const password = req.body.password

  User.findByCredentials(email, password).then(user => {
    return user.createSession().then(refreshToken => {
      // Session is created successfully - refreshToken returned.
      // now we generate an access auth token for the user

      return user.generateAccessAuthToken().then(accessToken => {
        // access auth token generated successfully, now we return an object containing the auth tokens
        return {accessToken, refreshToken}
      })
    }).then(authTokens => {
      // Now we construct and send the response to the user with their auth tokens in the header and the user object in the body

      res
      .header('x-refresh-token', authTokens.refreshToken)
      .header('x-access-token', authTokens.accessToken)
      .send(user)
    }).catch(e => {
      res.status(400).send(e)
    })
  })
})

/**
 * GET /users/me/access-token
 * Purpose: generate and returns an access token
 */
app.get('/users/me/access-token', verfiySession, (req, res) => {
  // we know that the user/caller is authenticated and we have the user_id and user object available to us
  req.userObject.generateAccessAuthToken().then(accessToken => {
    res.header('x-access-token', accessToken).send({accessToken})
  }).catch(e => {
    res.status(400).send(e)
  })
})

/* HELPER METHODS */
const deleteTasksFromList = (_listId) => {
  Task.deleteMany({
    _listId
  }).then(() => {
    console.log("Tasks from " + _listId + " were deleted")
  })
}

app.listen(5000, () => {
  console.log('Server is listening on port 5000')
})
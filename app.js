const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const dbPath = path.join(__dirname, 'todoApplication.db')
const app = express()
app.use(express.json())

let db = null

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

const convertDistrictObjectToDbResponse = districtDbObject => {
  return {
    id: districtDbObject.id,
    todo: districtDbObject.todo,
    category: districtDbObject.category,
    priority: districtDbObject.priority,
    status: districtDbObject.status,
    dueDate: districtDbObject.due_date,
  }
}

const hasPriorityAndStatusProperties = requestQuery => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  )
}

const hasCategiryAndStatusProperties = requestQuery => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  )
}

const hasCategiryAndPriorityProperties = requestQuery => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  )
}

const hasStatusProperty = requestQuery => {
  return requestQuery.status !== undefined
}

const hasPriorityProperty = requestQuery => {
  return requestQuery.priority !== undefined
}

const hasSearch_QProperty = requestQuery => {
  return requestQuery.search_q !== undefined
}

const hasCategoryProperty = requestQuery => {
  return requestQuery.category !== undefined
}

app.get(`/todos/`, async (request, response) => {
  const {todoId} = request.params
  let data = null
  const {status, priority, search_q = '', category} = request.query
  let getTodoQuery = ''
  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      getTodoQuery = `
    SELECT * FROM todo WHERE todo LIKE "%${search_q}%"
    AND status = '${status}'
    AND priority = '${priority}'
    `
      break
    case hasCategiryAndStatusProperties(request.query):
      getTodoQuery = `
    SELECT * FROM 
    todo
    WHERE todo LIKE '%${search_q}%'
    AND category = '${category}'
    AND status = '${status}';
    `
      break
    case hasCategiryAndPriorityProperties(request.query):
      getTodoQuery = `
    SELECT * FROM todo
    WHERE todo LIKE '%${search_q}'
    AND category = '${category}'
    AND priority = '${priority}';
    `
      break
    case hasStatusProperty(request.query):
      getTodoQuery = `
    SELECT * FROM todo
    WHERE todo LIKE '%${search_q}%'
    AND status = '${status}';
    `
      break
    case hasPriorityProperty(request.query):
      getTodoQuery = `
    SELECT * FROM todo
    WHERE todo LIKE '%${search_q}%'
    AND priority = '${priority}';
    `
      break
    case hasCategoryProperty(request.query):
      getTodoQuery = `
    SELECT * FROM todo 
    WHERE todo LIKE '%${search_q}'"
    AND category = '${category}';
    `
      break
    case hasSearch_QProperty(request.query):
      getTodoQuery = `
    SELECT * FROM todo 
    WHERE todo LIKE "%${search_q}%"
    AND search_q = '${search_q}';
    `
      break
    default:
      getTodoQuery = `
    SELECT * FROM todo
    WHERE todo LIKE '%${search_q}';
    `
  }

  data = await db.all(getTodoQuery)
  response.send(data)
})

// API -- 2

app.get(`/todos/:todoId/`, async (request, response) => {
  const {todoId} = request.params
  const {priority, category, status, dueDate} = request.body
  const getSingleTodoQuery = `
  SELECT 
  id,
  priority,
  category,
  status,
  due_date
  FROM todo WHERE id = ${todoId};
  `
  const singleTodoArray = await db.get(getSingleTodoQuery)
  response.send({
    id: singleTodoArray['id'],
    todo: singleTodoArray['todo'],
    priority: singleTodoArray['priority'],
    category: singleTodoArray['category'],
    status: singleTodoArray['status'],
    dueDate: singleTodoArray['due_date'],
  })
})

// API -- 3

app.get(`/agenda/`, async (request, response) => {
  const {date = ''} = request.query
  const {id, priority, category, status, dueDate} = request.body
  const getDistrictListQuery = `
  SELECT * FROM todo
  WHERE due_date LIKE '${date}';
  `
  const getDistrictListArray = await db.all(getDistrictListQuery)
  response.send(
    getDistrictListArray.map(eachDistrict =>
      convertDistrictObjectToDbResponse(eachDistrict),
    ),
  )
})

// API -- 4

app.post(`/todos/`, async (request, response) => {
  const {id, todo, category, priority, status, dueDate} = request.body
  const postTodoQuery = `
  INSERT INTO todo (id, todo, category, priority, status, due_Date)
  VALUES ('${id}', '${todo}', '${category}', '${priority}', '${status}', '${dueDate}');
  `
  await db.run(postTodoQuery)
  response.send('Todo Successfully Added')
})

// API -- 5
app.put(`/todos/:todoId/`, async (request, response) => {
  const {todoId} = request.params
  let updatedColumn = ``
  const requestBody = request.body
  switch (true) {
    case requestBody.status !== undefined:
      updatedColumn = 'Status'
      break
    case requestBody.priority !== undefined:
      updatedColumn = 'Priority'
      break
    case requestBody.category !== undefined:
      updatedColumn = 'Category'
      break
    case requestBody.todo !== undefined:
      updatedColumn = 'Todo'
      break
    case requestBody.dueDate !== undefined:
      updatedColumn = 'Due Date'
      break
  }
  const previousTodoQuery = `
  SELECT * FROM todo WHERE id = ${todoId};
  `
  const previousTodo = await db.get(previousTodoQuery)

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.dueDate,
  } = request.body

  const updatedTodoQuery = `
  UPDATE todo 
  SET 
  todo = '${todo}',
  priority = '${priority}',
  status = '${status}',
  category = '${category}',
  dueDate = '${dueDate}'
  WHERE id = ${todoId};
  `
  await db.run(updatedTodoQuery)
  response.send(`${updatedColumn} Updated`)
})

// API -- 6

app.delete(`/todos/:todoId/`, async (request, response) => {
  const {todoId} = request.params
  const deleteTodoQuery = `
  DELETE FROM todo WHERE id = ${todoId};
  `
  await db.run(deleteTodoQuery)
  response.send('Todo Deleted')
})

module.exports = app

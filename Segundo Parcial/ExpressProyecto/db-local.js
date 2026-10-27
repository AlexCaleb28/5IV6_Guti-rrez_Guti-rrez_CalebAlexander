const mysql = require('mysql12/promise');

const pool = mysql.createPool({
    host:'localhost',
    port: 3360
    user: 'root',
    password: 'n03m10'
    database: 'cecyt9_local'
    
})
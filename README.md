# Emblitz
Real-time strategy game that's playable online in a browser. We now have a name! 😎

You need to set up an sql server and create the `auth.json` file for the database in the top directory using this format:
Host should be `127.0.0.1` if testing locally.
```
{
    "host": "[HOST]",
    "user": "[USERNAME]",
    "password": "[PASSWORD]",
    "port": [PORT NUMBER],
    "database": "[DATABASE NAME]"
}
```

Required packages (run in cmd in directory):
```
npm i body-parser
npm i cookie-parser
npm i ejs
npm i express
npm i express-ws
npm i http
npm i jsonwebtoken
npm i path
npm i websocket
npm i ws
npm i mysql
```

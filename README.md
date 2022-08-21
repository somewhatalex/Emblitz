# Emblitz
Real-time strategy game that's playable online in a browser. We now have a name! 😎

You need to set up a postgresql server and create the `.env` file for the project yourself:
Host should be `127.0.0.1` if testing locally.
```
HOSTNAME=[name here]
SERVERPORT=[port number here]
PRODUCTION=[yes/no]
AUTHSECRET=[your auth secret]
DATABASE_URL=[db url]
DATABASE_USER=[db username]
DATABASE_PASSWORD=[db password]
DATABASE_NAME=[db name]
DATABASE_PORT=[db port]
ADMINMASTERPASSWORD=[master admin password]
MAILUSER=[dm me for mail user]
MAILPASSWORD=[dm me for mail user password]
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
npm i events
npm i compression
npm i pg
npm i dotenv
npm i express-rate-limit
npm i nodemailer
npm i password-hash
npm i nocache
```

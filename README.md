# Emblitz
Real-time strategy game that's playable online in a browser. Very simple to set up.

You need to set up a postgresql server and create the `.env` file for the project yourself:
Host should be `127.0.0.1` if testing locally. Database and packages are not included.
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

Install the required npm packages with this command:
```
npm i body-parser cookie-parser ejs express express-ws http jsonwebtoken path websocket ws events compression pg dotenv express-rate-limit nodemailer password-hash bad-words
```

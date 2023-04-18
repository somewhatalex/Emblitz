<p align="center">
  <img src="https://github.com/bob4koolest/Emblitz/blob/WIP/public/images/logo.png" width="80%" alt="Emblitz Logo">
</p>

___

# Emblitz
Emblitz is a real-time multiplayer strategy game! Deploy your troops, plan a strategy, attack your opponents, and use powerful boosts! Play it at [https://emblitz.com](https://emblitz.com).

Here's the game trailer:<BR>
[![Link to youtube video](http://img.youtube.com/vi/iQAZYuMBqYI/0.jpg)](http://www.youtube.com/watch?v=iQAZYuMBqYI "Emblitz | Official Trailer")

Be sure to set production mode to `no` if testing locally. Verification and logins will still direct you to the home page so you'll have to swap "emblitz.com" in the URL with your IP address.

You need to set up a postgresql server and create the `.env` file for the project yourself.
Host should be `127.0.0.1` if testing locally. Database, the config file (.env), and packages are not included if you download this repo. You can find the admin dashboard at `[your host]/admin` and log in using the admin password you set in `.env`.

Here's the .env template (you can find this in the `.env.example` file)
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
MAILUSER=[email username]
MAILPASSWORD=[email password]
ADS_ENABLED=[true/false]
ERROR_LOGGING=[true/false]
```

Install the required npm packages with this command:
```
npm i body-parser cookie-parser ejs express express-ws http jsonwebtoken path websocket ws events compression pg dotenv express-rate-limit nodemailer password-hash bad-words
```

___

&copy; Emblitz 2022<BR>
You are free to use this code for personal use only. Please do not edit `README.md` or use this for commercial purposes.

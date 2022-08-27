const express = require("express");
const app = express();
const httpserver = require("http").createServer();
const WebSocket = require("ws");
const wss = new WebSocket.Server({server: httpserver, path: "/ws"});
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require("path");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { Pool } = require("pg");
const auth = require("./scripts/auth.js");
const gamehandler = require("./scripts/game.js");
const emitter = require("events").EventEmitter;
const compression = require("compression");
const { resolve } = require("path");
const { rateLimit } = require("express-rate-limit");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { initDB } = require("./scripts/auth.js");
const badges = require("./scripts/badges.js");
const { response } = require("express");
const colorData = require("./scripts/colorData.js");
const nocache = require("nocache");
const badwords = require("bad-words");
/*Don't do it yourself, instead, be lazy and find a package that does it for you.
    -Sun Tzu, The Art of War

Update 7/27/22: passport.js creates a lot of hosting compatibility issues
and requires a separate db so I'll have to ignore this advice just for this
one time.
*/

if(process.env.PRODUCTION !== "yes") {
    console.log("Running in development environment!");
    require("dotenv").config();
} else {
    console.log("Running in production environment!");
}

//-- configs --
const authsecret = process.env.AUTHSECRET;
var port = process.env.SERVERPORT;

//GAME VERSION
const gameversion = "1.2.6 | 8/25/2022";

//mapname, maxplayers
const allmaps = {"miniworld": 3, "michigan": 6, "florida": 6};
//-- end configs --

//-- version --
console.log("Using game version " + gameversion);
//-- end version --

//-- player colors --
const playercoloroptions = ["red", "orange", "yellow", "green", "blue", "purple"];
//-- end player colors --

//-- DEV SERVER MONITOR VARS --//
var dev_emails = 0;
var dev_server_starttime = new Date();
dev_server_starttime = dev_server_starttime.toString();
var dev_server_abs_starttime = Date.now();
//-- end dev server monitor vars --//

var hostname = process.env.HOSTNAME + ":" + port;
if(process.env.PRODUCTION === "yes") {
    hostname = process.env.HOSTNAME;
    if(process.env.PORT) {
        port = process.env.PORT;
    }
}

const badWordsFilter = new badwords();

const game = new gamehandler();
const gameevents = gamehandler.gameevents;

//database
var dbcredentials = null;
if(process.env.PRODUCTION === "yes") {
    dbcredentials = {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    };
    console.log("Database set to production mode");
} else {
    dbcredentials = {
        host: process.env.DATABASE_URL,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        port: process.env.DATABASE_PORT,
        database: process.env.DATABASE_NAME
    };
    console.log("Database set to development mode");
}

const pool = new Pool(dbcredentials);
pool.connect(function(err) {
    if (err) console.log(err);

    //export db configs
    module.exports.db = pool;

    console.log("Connected to database!");
    auth.initDB().then(function() {
        console.log("Finished initializing database");
        
        setInterval(function() {
            auth.deleteUnusedAccounts();
        }, 900000);
    });
});

//--MAILER--
var mailTransport = null;
//if(process.env.PRODUCTION !== "yes") {
    console.log("Using development mail server (Gmail)");
    mailTransport = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.MAILUSER,
            pass: process.env.MAILPASSWORD
        }
    });
/*} else {
    //ADD IN CORRECT CREDENTIALS! (work on cloudmailin integration later)
    console.log("Using production mail server");
    mailTransport = nodemailer.createTransport({
        host: hostname,
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
            user: process.env.CLOUDMAILIN_USERNAME,
            pass: provess.env.CLOUDMAILIN_PASSWORD,
        },
        logger: true
    });
}
*/

const clients = new Map();
const rooms = [];
var userids = [];

function escapestring(str) {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

function escapeHTML(text) {
    try {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    } catch {
        return "";
    }
 }

function randomnumber(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function removeFromArray(arr, item) {
    for (var i = arr.length; i--;) {
      if (arr[i] === item) arr.splice(i, 1);
    }
}

function requireHTTPS(req, res, next) {
    //for Heroku only
    if (!req.secure && req.get('x-forwarded-proto') !== 'https' && process.env.PRODUCTION === "yes") {
      return res.redirect('https://' + req.get('host') + req.url);
    }
    next();
}

//-- RATELIMITS --//
const apiLimiter = rateLimit({
	windowMs: 0.5 * 60000, //minutes
	max: 40,
    message: JSON.stringify({"error": 429, "message": "You are accessing the api too quickly (40 requests/30 sec)! Try again in a minute. Calm down my guy."}),
	standardHeaders: true,
	legacyHeaders: false
});
const adminApiLimiter = rateLimit({
	windowMs: 1 * 60000, //minutes
	max: 10,
    message: JSON.stringify({"error": 429, "message": "You are accessing the auth api too quickly (10 requests/min)! Please go and bing chilling, and try again in a minute."}),
	standardHeaders: true,
	legacyHeaders: false
});
const mailApiLimiter = rateLimit({
	windowMs: 5 * 60000, //minutes
	max: 5,
    message: JSON.stringify({"error": 429, "message": "You are accessing the auth 2 api too quickly (3 requests/5 min)! Please go and bing chilling, and try again in 5 minutes."}),
	standardHeaders: true,
	legacyHeaders: false
});

app.set("view engine", "html");
app.engine("html", require("ejs").renderFile);
app.set("views", path.join(__dirname, "./public"));
app.disable("x-powered-by");
app.use(requireHTTPS);
app.use(compression());
app.use("/api/", apiLimiter);
app.use("/authapi/", adminApiLimiter);
app.use("/auth2/", mailApiLimiter);

/*
App can't have pages caching because too much of it is dynamic
and changes very frequently. Plus, webpages are small enough
to not suffer a noticably slower load time as a result.
*/
app.use(nocache());

//enable req.body to be used
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(cookieParser());

app.all("/", (req, res) => {
    let getuuid = req.cookies.uuid;

    //for now, create a new game id (GID) every time a page loads for security
    //this way, leaking the game id won't compromise a player's "account"
    //replacement for user registration FOR NOW
    let chars = "1234567890qwertyuiopasdfghjklzxcvbnm";
    let id = "";
    for(let i=0; i<30; i++) {
        id += chars.charAt(crypto.randomInt(0, chars.length-1));
    }
    res.cookie("GID", id);

    let profileoutput = `
    <DIV CLASS="po-container">
        <DIV CLASS="po-description">Login or register to set a username, earn medals, see stats, and more! Only takes about 30 seconds!</DIV>
        <BUTTON CLASS="joinbutton jb_green" ONCLICK="window.location.href='./login?action=register'" STYLE="font-size: 18px; min-width: 150px; margin-top: 10px;">Register</BUTTON><BUTTON ONCLICK="window.location.href='./login'" STYLE="font-size: 18px; min-width: 150px; margin-top: 10px;" CLASS="joinbutton jb_gray">Login</BUTTON>
    </DIV>
    `

    if(!getuuid) {
        //guest user
        let guestuuid = "";
        for(let i=0; i<50; i++) {
            guestuuid += chars.charAt(crypto.randomInt(0, chars.length-1));
        }

        res.cookie("uuid", "guest-" + guestuuid, { expires: new Date(Date.now() + (10*24*3600000))});
        
        guestuuid = "";
        for(let i=0; i<50; i++) {
            guestuuid += chars.charAt(crypto.randomInt(0, chars.length-1));
        }
        res.cookie("publickey", "guest-" + guestuuid, { expires: new Date(Date.now() + (10*24*3600000))});

        res.render("index", {
            host_name: hostname,
            prod: process.env.PRODUCTION,
            gameversion: gameversion,
            profile_output: profileoutput
        });
    } else if(!getuuid.startsWith("guest-")) {
        auth.getUserInfo(getuuid).then(function(userinfo) {
            //logged in user
            res.cookie("publickey", userinfo.publickey, { expires: new Date(Date.now() + (100*24*3600000))});
            
            let profileoutput = `
            <DIV CLASS="po-container" STYLE="margin-bottom: 20px">
                <DIV CLASS="po-description" STYLE="text-align: left">
                    <A CLASS="my_profile" HREF="./login?action=verify">Please verify your account by <U>clicking here</U>. Note that unverified accounts will be deleted in an hour.</A>
                </DIV>
            </DIV>
            `;

            if(userinfo.verified === "true") {
                profileoutput = "";
            }

            profileoutput += `
            <DIV CLASS="profile-outline" STYLE="background: ${colorData[userinfo.playercolor].normal}">
                <DIV CLASS="glb_avatar-frame" STYLE="border: 5px solid ${userinfo.playercolor}"><IMG STYLE="width: 60px; height: 60px" SRC="./images/defaultpfp.png"></DIV>
                <DIV CLASS="glb_p_info">
                    <DIV ID="p_name" CLASS="lb_p_name">${userinfo.username}</DIV>
                    <A CLASS="my_profile" HREF="./user/${userinfo.username}"><SPAN STYLE="text-decoration: underline">My profile</SPAN> <I CLASS="fa fa-external-link-square"></I></A>
                    <A CLASS="my_profile mp_settings" HREF="./settings"><SPAN STYLE="text-decoration: underline">Settings</SPAN> <I CLASS="fa fa-gear"></I></A>
                </DIV>
            </DIV>
            <DIV CLASS="my_stats">
                <SPAN CLASS="ms_stat ms_stat_one"><IMG CLASS="ms_medals" SRC="./images/medal.png"><SPAN ID="ms_medals">--</SPAN> Medals</SPAN>
                <SPAN CLASS="ms_stat ms_stat_two"><IMG CLASS="ms_badges" SRC="./images/badgeicon.png"><SPAN ID="ms_badges">--</SPAN> Badges</SPAN>
            </DIV>
            `

            res.render("index", {
                host_name: hostname,
                prod: process.env.PRODUCTION,
                gameversion: gameversion,
                profile_output: profileoutput
            });
        }).catch(function() {
            //guest user bc uuid is invalid
            let guestuuid = "";
            for(let i=0; i<50; i++) {
                guestuuid += chars.charAt(crypto.randomInt(0, chars.length-1));
            }

            res.cookie("uuid", "guest-" + guestuuid, { expires: new Date(Date.now() + (10*24*3600000))});
            
            guestuuid = "";
            for(let i=0; i<50; i++) {
                guestuuid += chars.charAt(crypto.randomInt(0, chars.length-1));
            }
            res.cookie("publickey", "guest-" + guestuuid, { expires: new Date(Date.now() + (10*24*3600000))});
            
            res.render("index", {
                host_name: hostname,
                prod: process.env.PRODUCTION,
                gameversion: gameversion,
                profile_output: profileoutput
            });
        });
    } else {
        //guest user
        res.render("index", {
            host_name: hostname,
            prod: process.env.PRODUCTION,
            gameversion: gameversion,
            profile_output: profileoutput
        });
    }
});

httpserver.on("request", app);

app.get("/api", (req, res) => {
    res.json({"error": "invalid form body"});
});

app.get("/authapi", (req, res) => {
    res.json({"error": "invalid form body"});
});

app.get("/login", (req, res) => {
    let uuid = req.cookies.uuid;
        
    if(uuid) {
        auth.getUserInfo(uuid).then(function(userinfo) {
            res.render("login", {
                host_name: hostname,
                currentuser: `<DIV CLASS="lg_headertext_acct">You're already logged in as <B>${userinfo.username}</B>, but you can log into a different account.</DIV>`
            });
        }).catch(function() {
            res.render("login", {
                host_name: hostname,
                currentuser: ""
            });
        });
    } else {
        res.render("login", {
            host_name: hostname,
            currentuser: ""
        });
    }
});

app.get("/tutorial", (req, res) => {
    res.render("tutorial")
});

app.get("/admin", (req, res) => {
    res.render("admin");
});

app.get("/settings", (req, res) => {
    let uuid = req.cookies.uuid;
        
    if(uuid) {
        auth.getUserInfo(uuid).then(function(userinfo) {
            res.render("settings", {
                playercolor: userinfo.playercolor,
                playername: userinfo.username
            });
        }).catch(function() {
            res.redirect("./login");
        })
    }
});

app.get("/privacy", (req, res) => {
    res.render("privacy");
});

app.get("/user/*", (req, res) => {
    let username = req.path.split("/")[2];

    auth.getPublicUserInfo(username).then(function(result) {
        res.render("user", {
            username: result.username,
            playercolor: result.playercolor,
            playercolorbg: colorData[result.playercolor].normal
        });
    }).catch(function() {
        res.render("./errorpages/404")
    });
});

app.get("/verify", (req, res) => {
    let gettoken = req.query.token;
    let outputresult = ``;
    jwt.verify(gettoken, authsecret, function(err, decoded) {
        //invalid token
        if(err || decoded.iss != "dr. defario's grandson samuel") {
            outputresult = `Oops... an error occured. Your link might've expired or broke; try getting another verification email. Sorry about that.  <A CLASS="lg_register jb_green" STYLE="display: block; margin: auto; margin-top: 30px; text-decoration: none" HREF="https://www.emblitz.com">Back to Emblitz</A>`
            res.render("verify", {
                result: outputresult
            });
        } else {
            pool.query(`SELECT * FROM users WHERE publickey=$1 AND email=$2 AND verified=$3`, [decoded.data[0].publickey, decoded.data[0].email, false], function(err, result) {
                if(err || result.rows.length == 0) {
                    outputresult = `Oops... an error occured. Your link might've expired, been used, or broke; try getting another verification email. Sorry about that. <A CLASS="lg_register jb_green" STYLE="display: block; margin: auto; margin-top: 30px; text-decoration: none" HREF="https://www.emblitz.com">Back to Emblitz</A>`;
                    res.render("verify", {
                        result: outputresult
                    });
                } else {
                    let getusername = result.rows[0].username;
                    pool.query(`UPDATE users SET verified=$1 WHERE publickey=$2 AND email=$3`, [true, decoded.data[0].publickey, decoded.data[0].email], function(err, result) {
                        auth.awardBadge(decoded.data[0].publickey, "verifiedaccount");
                        
                        let outputresult = `Thanks for verifying your account! You can now login through the login page using your username and password. Enjoy the game!<DIV STYLE="display: block; margin-top: 20px;">Your username: <B>${getusername}</B></DIV><A CLASS="lg_register jb_green" STYLE="display: block; margin: auto; margin-top: 30px; text-decoration: none" HREF="https://emblitz.com">To Emblitz!</A>`;
                        res.render("verify", {
                            result: outputresult
                        });
                    });
                }
            });
        }
    });
});

app.post("/verify", (req, res) => {
    res.json({"error": "please use GET"});
});

//id = roomid
function getroommap(id) {
    for(let i=0; i<rooms.length; i++) {
        if(rooms[i].id === id) {
            return rooms[i].map.toString();
        }
    }
}

app.post("/auth2", (req, res) => {
    if(req.body.action === "registeruser") {
        let errors = [];
        let emailformatted = req.body.email.match(
            /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
        let usernameformatted = req.body.username.match(
            /^[a-zA-Z0-9_]+$/
        );

        let wordtofilter = req.body.username.replace(/_/g, "");
        let containsbadwords = badWordsFilter.isProfane(wordtofilter);
        
        if(req.body.username.length < 2) {
            errors.push("u1");
        } else if(req.body.username.length > 12) {
            errors.push("u2")
        } else if(!usernameformatted) {
            errors.push("u4");
        } else if(containsbadwords) {
            errors.push("u5");
        }
        if(!req.body.email) {
            errors.push("e1");
        } else if(!emailformatted) {
            errors.push("e2");
        }
        if(!req.body.password) {
            errors.push("p1")
        } else if(req.body.password.length < 8 || req.body.password.length > 30) {
            errors.push("p2");
        }

        auth.checkUserConflicts(req.body.username, req.body.email).then(function(conflicts) {
            errors = errors.concat(conflicts);
            if(errors.length > 0) {
                res.json({"errors": errors});
                return;
            }


            //passed all checks...
            //add user to database
            auth.registerUser(req.body.username, req.body.email, req.body.password).then(function(tokens) {
                var mail = {
                    from: "'Emblitz Team' <emblitz@emblitz.com>",
                    to: req.body.email,
                    subject: "Please verify your new account!",
                    html: ` <BODY STYLE="background: #121212; padding-top: 45px; padding-bottom: 45px; width: 100%;">
                                <DIV STYLE="width: calc(100% - 40px); max-width: 700px; margin: auto; background: #303030; margin: auto; padding: 20px;">
                                    <IMG SRC="https://www.emblitz.com/images/logo.png" STYLE="width: 100%; max-width: 350px;">
                                    <DIV STYLE="margin-top: 10px; color: #ffffff; font-size: 18px; font-family: sans-serif; margin-left: 8px;"><DIV STYLE="display: block; margin-bottom: 5px;">Dear ${req.body.username},</DIV>Thanks for registering for an Emblitz account! Please verify your email first to finish setting up your account by clicking the button below. This email is valid for the next 10 minutes. Please note that unverified accounts will be deleted after an hour. If you didn't make this request, simply ignore this email.<A HREF="emblitz.com/verify?token=${tokens[1]}" TARGET="_blank" STYLE="display: block; margin-top: 30px; margin-bottom: 30px; -webkit-appearance: none; -moz-appearance: none; appearance: none; border: none; border-radius: 10px; font-size: 18px; padding: 10px; width: 120px; text-align: center; text-decoration: none; color: #ffffff; background: #00b00f; cursor: pointer">Verify Email</A>Thanks,<BR>-The Emblitz Team<DIV STYLE="margin-top: 60px;">&copy; Emblitz</DIV></DIV>
                                </DIV>
                            </BODY>              
                            `
                };
                
                mailTransport.sendMail(mail);
                dev_emails++;
                res.cookie("uuid", tokens[0], { expires: new Date(Date.now() + (2*24*3600000))}); //2 days expiry bc temporary and account isn't verified yet
                res.cookie("publickey", tokens[2], { expires: new Date(Date.now() + (2*24*3600000))});
                res.json({"ok": true});
            });
        });
    } else if(req.body.action === "resendemail") {
        let uuid = req.cookies.uuid;
        
        if(uuid) {
            auth.verifyUUID(uuid).then(function(data) {
                var mail = {
                    from: "'Emblitz Team' <emblitz@emblitz.com>",
                    to: data[0],
                    subject: "Please verify your new account!",
                    html: ` <BODY STYLE="background: #121212; padding-top: 45px; padding-bottom: 45px; width: 100%;">
                                <DIV STYLE="width: calc(100% - 40px); max-width: 700px; margin: auto; background: #303030; margin: auto; padding: 20px;">
                                    <IMG SRC="https://www.emblitz.com/images/logo.png" STYLE="width: 100%; max-width: 350px;">
                                    <DIV STYLE="margin-top: 10px; color: #ffffff; font-size: 18px; font-family: sans-serif; margin-left: 8px;"><DIV STYLE="display: block; margin-bottom: 5px;">Dear ${data[1]},</DIV>Thanks for registering for an Emblitz account! Please verify your email first to finish setting up your account by clicking the button below. This email is valid for the next 10 minutes. Please note that unverified accounts will be deleted after an hour. If you didn't make this request, simply ignore this email.<A HREF="emblitz.com/verify?token=${data[2]}" TARGET="_blank" STYLE="display: block; margin-top: 30px; margin-bottom: 30px; -webkit-appearance: none; -moz-appearance: none; appearance: none; border: none; border-radius: 10px; font-size: 18px; padding: 10px; width: 120px; text-align: center; text-decoration: none; color: #ffffff; background: #00b00f; cursor: pointer">Verify Email</A>Thanks,<BR>-The Emblitz Team<DIV STYLE="margin-top: 60px;">&copy; Emblitz</DIV></DIV>
                                </DIV>
                            </BODY>              
                            `
                };
                
                mailTransport.sendMail(mail);
                dev_emails++;

                res.json({"email": data[0]});
            }).catch(function(error) {
                res.json({"error": "lookup_1"});
            });
        } else {
            res.json({"error": "lookup_2"})
        }
    } else if(req.body.action === "resetpassword") {
        
    }
})

app.post("/authapi", (req, res) => {
    //admin functions
    if(req.body.action === "createpost") {
        if(req.body.auth !== process.env.ADMINMASTERPASSWORD) {
            res.status(403);
            res.json({"error": "403", "message": "You are not authorized to make this call!"});
            return;
        }
        auth.postAnnouncement(req.body.title, req.body.content, req.body.submittedtime, req.body.image).then(function() {
            res.json({"result": "post created successfully"});
        });
    } else if(req.body.action === "deletepost") {
        if(req.body.auth !== process.env.ADMINMASTERPASSWORD) {
            res.status(403);
            res.json({"error": "403", "message": "You are not authorized to make this call!"});
            return;
        }
        auth.deleteAnnouncement(req.body.postid).then(function() {
            res.json({"result": "deleted post"})
        });
    } else if(req.body.action === "validatepassword") {
        if(req.body.auth === process.env.ADMINMASTERPASSWORD) {
            res.json({"result": true});
        } else {
            res.json({"result": false});
        }
    } if(req.body.action === "runsqlquery") {
        if(req.body.auth !== process.env.ADMINMASTERPASSWORD) {
            res.status(403);
            res.json({"error": "403", "message": "You are not authorized to make this call!"});
            return;
        }
        auth.runSQLQuery(req.body.query).then(function(result) {
            res.json({"result": result.rows});
        });
    } else if(req.body.action === "login") {
        if(req.body.username && req.body.password) {
            auth.userLogin(req.body.username, req.body.password).then(function(userdata) {
                userdata = userdata[0];
                res.cookie("publickey", userdata.publickey, { expires: new Date(Date.now() + (30*24*3600000))});
                res.cookie("uuid", userdata.token, { expires: new Date(Date.now() + (30*24*3600000))});
                res.json({
                    "username": userdata.username,
                    "email": userdata.email,
                    "wins": userdata.wins,
                    "losses": userdata.losses,
                    "medals": userdata.medals,
                    "badges": userdata.badges,
                    "pfp": userdata.pfp,
                    "tournamentprogress": userdata.tournamentprogress,
                    "verified": userdata.verified,
                    "timecreated": userdata.timecreated,
                    "playercolor": userdata.playercolor,
                    "playersettings": userdata.playersettings,
                    "metadata": userdata.metadata
                });
            }).catch(function(error) {
                res.json({"error": error});
            });
        } else if(!req.body.username && req.body.password) {
            res.json({"error": "missing username"});
        } else if(!req.body.password && req.body.username) {
            res.json({"error": "missing password"});
        } else {
            res.json({"error": "missing username and password"})
        }
    }
});

app.post("/api", (req, res) => {
    try {
        if(req.body.action === "getdevstats") {
            if(req.body.auth !== process.env.ADMINMASTERPASSWORD) {
                res.status(403);
                res.json({"error": "403", "message": "You are not authorized to make this call!"});
                return;
            }
            res.json({"starttime": dev_server_starttime, "startms": dev_server_abs_starttime, "emailssent": dev_emails});
        } else if (req.body.action === "editplayercolor") {
            let getuuid = req.cookies.uuid;
            let color = req.body.color;
            if(color && getuuid && playercoloroptions.includes(color)) {
                auth.changePlayerColor(getuuid, color).then(function() {
                    res.json({"success": "colorchanged"});
                }).catch(function() {
                    res.json({"error": "not logged in"});
                });
            } else {
                res.json({"error": "invalid parameters provided"});
            }
        } else if(req.body.action === "fetchposts") {
            if(!isNaN(Number(req.body.startindex)) && !isNaN(Number(req.body.amount))) {
                let startindex = req.body.startindex;
                let amount = req.body.amount;
                if(amount > 25) {
                    amount = 25;
                } else if(amount < 1) {
                    amount = 1;
                }

                if(startindex < 0 || startindex > 99999999) {
                    startindex = 0
                }
                auth.fetchAnnouncements(startindex, amount).then(function(result) {
                    res.json({"posts": result});
                });
            } else {
                res.status(400);
                res.json({"error": 400, "message": "Malformed request"});
            }
        } else if(req.body.action === "getmap") {
            var roommap = getroommap(req.body.roomid);
            fs.readFile("./mapdata/" + roommap + "/" + roommap + ".txt", "utf8", function(err, data) {
                fs.readFile("./mapdata/" + roommap + "/mapdict.json", "utf8", function(err, mapdict) {
                    fs.readFile("./mapdata/" + roommap + "/moves.json", "utf8", function(err, moves) {
                        fs.readFile("./mapdata/" + roommap + "/coordadjust.json", "utf8", function(err, coordadjust) {
                            fs.readFile("./mapdata/" + roommap + "/metadata.json", "utf8", function(err, metadata) {
                                res.json({"mapdata": data, "mapdict": mapdict, "moves": moves, "coordadjust": coordadjust, "metadata": metadata});
                            });
                        });
                    });
                });
            });
        } else if(req.body.action === "joingame") {
            //did player request for specific room?
            if(req.body.preset) {
                //does room exist?
                let preset = req.body.preset;
                let roomfound = false;
                for(let i=0; i<rooms.length; i++) {
                    if(rooms[i].id === preset) {
                        //is room full?
                        if(rooms[i]["players"] >= rooms[i]["maxplayers"]) {
                            res.json({"error": "room " + preset + " is full"});
                        } else {
                            res.json({"uid": userid(), "room": preset});
                        }
                        roomfound = true;
                        break;
                    }
                }
                if(!roomfound) {
                    res.json({"error": "room " + preset + " does not exist"});
                }
            } else {
                res.json({"uid": userid(), "room": joinroom(req.body.prefermap, req.body.createnewroom)});
            }
        } else if (req.body.action === "getmyinfo") {
            let getuuid = req.cookies.uuid;
            auth.getUserInfo(getuuid).then(function(userdata) {
                res.json({
                    "username": userdata.username,
                    "email": userdata.email,
                    "wins": userdata.wins,
                    "losses": userdata.losses,
                    "medals": userdata.medals,
                    "badges": userdata.badges,
                    "pfp": userdata.pfp,
                    "tournamentprogress": userdata.tournamentprogress,
                    "verified": userdata.verified,
                    "timecreated": userdata.timecreated,
                    "playercolor": userdata.playercolor,
                    "playersettings": userdata.playersettings,
                    "metadata": userdata.metadata,
                    "xp": userdata.xp
                });
            }).catch(function(error) {
                res.json({"error": "no user found"})
            });
        } else if(req.body.action === "getuserprofile") {
            auth.getPublicUserInfo(req.body.username).then(function(userdata) {
                res.json({
                    "username": userdata.username,
                    "wins": userdata.wins,
                    "losses": userdata.losses,
                    "medals": userdata.medals,
                    "badges": userdata.badges,
                    "pfp": userdata.pfp,
                    "tournamentprogress": userdata.tournamentprogress,
                    "timecreated": userdata.timecreated,
                    "playercolor": userdata.playercolor,
                    "xp": userdata.xp
                });
            }).catch(function(error) {
                res.json({"error": "no user found"})
            });
        } else if(req.body.action === "badgedata") {
            res.json(badges);
        } else if(req.body.action === "logoutuser") {
            res.clearCookie("uuid");
            res.clearCookie("publickey");
            res.send("logged out");
        } else {
            res.json({"error": "invalid form body"});
            res.end();
        }
    } catch(e) {
        console.log(e);
    }
});

app.use(express.static(__dirname + "/public"));

app.use(function(req, res, next) {
    res.status(404);
    res.sendFile("./public/errorpages/404.html", {root: __dirname});
});

//public id generator
function userid() {
    let chars = "1234567890qwertyuiopasdfghjklzxcvbnm";
    let id = "u-";
    for(let i=0; i<20; i++) {
        id += chars.charAt(randomnumber(0, chars.length-1));
    }
    while(userids.includes(id)) {
        let id = "u-"
        for(let i=0; i<20; i++) {
            id += chars.charAt(randomnumber(0, chars.length-1));
        }
    }
    userids.push(id);
    return id;
}

//if no username is specified, generate a random username
function genPname() {
    return "Player " + randomnumber(1, 999);
    //TODO: check and prevent duplicate names
}

//returns true if duplicate room ids exist
function checkDupeRoom(id) {
    for(let i=0; i<rooms.length; i++) {
        if(rooms[i].id === id) {
            return true;
        }
    }
}

function joinroom(map, createroom) {
    let roommap = "";
    let allmapnames = Object.keys(allmaps);
    let randommap = false;
    if(map !== "random" && allmapnames.includes(map)) {
        roommap = map;
    } else {
        roommap = allmapnames[Math.floor(Math.random()*allmapnames.length)];
        randommap = true;
    }

    let maxplayers = allmaps[roommap];
    let deploytime = 10;

    let isprivate = false;
    if(createroom) {
        isprivate = true;
    }

    if(rooms.length < 1 || createroom) {
        let chars = "1234567890qwertyuiopasdfghjklzxcvbnm";
        let id = "r-";
        for(let i=1; i<7; i++) {
            id += chars.charAt(randomnumber(0, chars.length-1));
        }

        while(checkDupeRoom(id)) {
            id = "r-";
            for(let i=1; i<7; i++) {
                id += chars.charAt(randomnumber(0, chars.length-1));
            }
        }
        
        rooms.push({"id": id, "isprivate": isprivate, "ingame": false, "map": roommap, "created": Math.floor(new Date().getTime()), "deploytime": deploytime, "maxplayers": maxplayers, "players": 0, "playersconfirmed": [], "playersready": 0, "playerslist": []});
        game.newGame(id, roommap, deploytime, isprivate).then(function(result) {
            //console.log(result)
        });
        return id;
    } else {
        for(let i=0; i<rooms.length; i++) {
            //remove rooms with 0 users that persist longer than 30 seconds -- futureproof, also see line 380ish
            if(rooms[i]["players"] < 1) {
                if((Math.floor(new Date().getTime()) - rooms[i]["created"]) > 30000) {
                    game.removeGame(rooms[i].id);
                    rooms.splice(i, 1);
                }
            }

            //join room if available (and NOT in active game)
            if(rooms[i]["players"] < rooms[i]["maxplayers"] && rooms[i]["ingame"] == false && rooms[i]["isprivate"] == false) {
                if(randommap) {
                    return rooms[i]["id"];
                } else if(rooms[i]["map"] === roommap) {
                    return rooms[i]["id"];
                }
            }
        }

        let chars = "1234567890qwertyuiopasdfghjklzxcvbnm";
        let id = "r-";
        for(let i=1; i<7; i++) {
            id += chars.charAt(randomnumber(0, chars.length-1));
        }

        while(checkDupeRoom(id)) {
            id = "r-";
            for(let i=1; i<7; i++) {
                id += chars.charAt(randomnumber(0, chars.length-1));
            }
        }

        rooms.push({"id": id, "isprivate": isprivate, "ingame": false, "map": roommap, "created": Math.floor(new Date().getTime()), "maxplayers": maxplayers, "players": 0, "playersconfirmed": [], "playersready": 0, "playerslist": []});
        game.newGame(id, roommap, deploytime, isprivate).then(function(result) {
            //console.log(result)
        });
        return id;
    }
}

httpserver.listen(port, function() {
    console.log("Server started on port " + port);
});

/* test:
setTimeout(function() {
    [...clients.keys()].forEach((client) => {
        client.send(JSON.stringify({"fard": "success"}));
    });
}, 10000);
*/

//send json message to all members in a room w/o request
function sendRoomMsg(roomid, message) {
    [...clients.keys()].forEach((client) => {
        let clientdata = clients.get(client);
        if(clientdata["room"] === roomid) {
            client.send(JSON.stringify(message));
        }
    });
}

gameevents.on("updateMap", function(result) {
    sendRoomMsg(result[0], {"updatemap": result[1]});
});

gameevents.on("startAttackPhase", function(result) {
    sendRoomMsg(result[0], {"startAttackPhase": "ok"});
    game.addTroopsPassively(result[0])
});

gameevents.on("startDeployPhase", function(result) {
    sendRoomMsg(result[0], {"startgame": true, "deploytime": result[1]/1000});
    let roomcount = rooms.length;
    for(let i=0; i<roomcount; i++) {
        if(rooms[i].id === result[0]) {
            rooms[i]["ingame"] = true;
            break;
        }
    }
});

gameevents.on("syncTroopTimer", function(result) {
    sendRoomMsg(result[0], {"syncTroopTimer": result[1]});
});

gameevents.on("updateLobbyTimer", function(result) {
    setTimeout(function() {
        sendRoomMsg(result[0], {"lobbytimer": Math.round(result[1]/1000)-1});
    }, 1000);
});

gameevents.on("playerdead", function(result) {
    sendRoomMsg(result[0], {"playerdead": result[1], "place": result[2]});
});

gameevents.on("playerWon", function(result) {
    sendRoomMsg(result[0], {"playerWon": result[1]});
});

gameevents.on("medalchange", function(result) {
    sendRoomMsg(result[0], {"playermedalchange": result[1], "amount": result[2]});
});

//passively send messages to all users in room w/o request
//format: sendRoomMsg("room69", {"bobux": "momento"});

wss.on("connection", (ws) => {
    //passively send message to single player w/o request
    ws.send(JSON.stringify({"connection": "success"}));

    //send json message to all members in a room w/o request
    function sendRoomMsg(roomid, message) {
        [...clients.keys()].forEach((client) => {
            let clientdata = clients.get(client);
            if(clientdata["room"] === roomid) {
                //do everything in here
                client.send(JSON.stringify(message));
            }
        });
    }

    //passively send messages to all users in room w/o request
    //format: sendRoomMsg("room69", {"bobux": "momento"});

    ws.on("message", (response) => {
        //RESPONDS TO A SINGULAR PLAYER REQUEST
        let message = response.toString();
        let action = JSON.parse(message).action;

        //auth
        if(action !== "userlogin") {
            if(clients.get(ws).gid !== JSON.parse(message).gid || clients.get(ws).uid !== JSON.parse(message).uid) {
                ws.send(JSON.stringify({"error": "invalid credentials"}));
                return;
            }
        }

        if(action === "userlogin") {
            let userinfo = JSON.parse(message);
            let uid = escapeHTML(userinfo.uid);
            let pubkey = userinfo.pubkey;
            let room = escapeHTML(userinfo.roomid);
            let gid = userinfo.gid;

            //is room full? as a double check measure
            //first add the player to the total room count though before checking
            let totalroomcount = rooms.length;
            for(let i=0; i<totalroomcount; i++) {
                if(rooms[i].id === room) {
                    rooms[i]["players"]++;
                    if(rooms[i]["players"] > 1) {
                        if(game.queryGameStatus(rooms[i]["id"]) === "lobby") {
                            game.resumeLobbyTimer(rooms[i]["id"]);
                        }
                    }
                    break;
                }
            }
            let roomplayercount = rooms.filter(function(item) {
                return item.id === room;
            });
            roomplayercount = roomplayercount[0];
            let maxroomplayers = roomplayercount.maxplayers;
            roomplayercount = roomplayercount.players;
            if(roomplayercount > maxroomplayers) {
                ws.send(JSON.stringify({"error": "roomfull"}));
            }

            let pname = null;
            let pcolor = null;

            auth.getUserInfoNoReject(userinfo.uuid).then(function(userdata) {
                if(!userdata) {
                    pname = genPname();
                    pcolor = "red";
                } else {
                    pname = userdata.username;
                    pcolor = userdata.playercolor;
                }

                //give players their preferred color; if taken, assign a different random color
                for(let i=0; i < rooms.length; i++) {
                    if (rooms[i].id === room) {
                        let takencolors = [];
                        let availablecolors = playercoloroptions;
                        let playerliststring = rooms[i]["playerslist"];
                        for(let i=0; i<playerliststring.length; i++) {
                            takencolors.push(playerliststring[i]["pcolor"]);
                        }
                        
                        if(takencolors.includes(pcolor)) {
                            for(let i=0; i<takencolors.length; i++) {
                                availablecolors = availablecolors.filter(function(item) {
                                    return item !== takencolors[i];
                                });
                            }
                            pcolor = availablecolors[(Math.random() * availablecolors.length) | 0];
                        }
                        break;
                    }
                }
                
                var metadata = {uid, room, pname, pcolor, gid, pubkey};
                clients.set(ws, metadata);

                ws.send(JSON.stringify({"setcolor": pcolor}));

                //add pname to room list
                let tclient = clients.get(ws);
                for (var i=0; i < rooms.length; i++) {
                    if (rooms[i].id === tclient.room) {
                        rooms[i]["playerslist"].push({"id": uid, "name": pname, "pcolor": pcolor});
                        game.addPlayer(tclient.room, uid, pubkey).then(function(result) {
                            //console.log(result);
                        })
                        break;
                    }
                }

                ws.send(JSON.stringify({"mapname": getroommap(tclient.room)}));
                [...clients.keys()].forEach((client) => {
                    let clientdata = clients.get(client);
        
                    if(clientdata["room"] === JSON.parse(message).roomid) {
                        //copied over
                        function sendmsg(message) {
                            client.send(JSON.stringify(message));
                        }
                        sendmsg({"users": rooms[i]["playerslist"], "playersconfirmed": rooms[i]["playersconfirmed"], "isprivateroom": rooms[i]["isprivate"]});
                    }
                });
            });
        } else if (action === "mapready") {
            let tclient = clients.get(ws);
            for (var i=0; i < rooms.length; i++) {
                if (rooms[i].id === tclient.room) {
                    rooms[i]["playersready"]++;
                    break;
                }
            }
        } else if (action === "userconfirm") {
            let tclient = clients.get(ws);
            for (var i=0; i < rooms.length; i++) {
                if (rooms[i].id === tclient.room) {
                    if(!rooms[i]["playersconfirmed"].includes(JSON.parse(message).uid)) {
                        rooms[i]["playersconfirmed"].push(JSON.parse(message).uid);
                    }

                    if(rooms[i]["playersconfirmed"].length == rooms[i]["players"] && rooms[i]["players"] > 1) {
                        game.skipLobbyTimer(rooms[i].id);
                    }
                    break;
                }
            }
        /* NOTE: also leave EVERY player move handler down here since message sending is done separately.
           This is to stop a new event emitter from being created for every player */
        } else if(action === "deploy") {
            //see game.js, deployTroops
            game.deployTroops(JSON.parse(message).roomid, JSON.parse(message).uid, JSON.parse(message).target);
        } else if(action === "attack") {
            game.attackTerritory(JSON.parse(message).roomid, JSON.parse(message).uid, JSON.parse(message).start, JSON.parse(message).target, JSON.parse(message).trooppercent);
        }
    
        //EVERYTHING BELOW HERE WILL BE SENT TO ALL MEMBERS OF A ROOM
        [...clients.keys()].forEach((client) => {
            let clientdata = clients.get(client);

            if(clientdata["room"] === JSON.parse(message).roomid) {
                //to simplify things a little
                function sendmsg(message) {
                    client.send(JSON.stringify(message));
                }

                //begin possible inbound commands
                if(action === "mapready") {
                    sendmsg({"usersready": rooms[i]["playersready"]});
                    //console.log(rooms[i]["playersready"] + " / " + rooms[i]["players"])
                    if(rooms[i]["playersready"] == rooms[i]["players"]) {
                        sendmsg({"message": "all users loaded"});
                        sendmsg({"users": rooms[i]["playerslist"], "playersconfirmed": rooms[i]["playersconfirmed"]});
                    }
                } else if(action === "userconfirm") {
                    sendmsg({"confirmedusers": rooms[i]["playersconfirmed"]});
                }
            }
        });
    });

    ws.on("close", () => {
        let removeclient = clients.get(ws);
        let removeclientid = removeclient.uid;
        removeFromArray(userids, removeclientid);
        for (var i=0; i < rooms.length; i++) {
            if (rooms[i].id === removeclient.room) {
                rooms[i]["players"]--;
                if(rooms[i]["players"] < 2) {
                    if(game.queryGameStatus(rooms[i]["id"]) === "lobby") {
                        game.pauseLobbyTimer(rooms[i]["id"]);
                    }
                }
                if(rooms[i].ingame) {
                    rooms[i]["playersready"]--;
                }

                //splice client id as well
                if(rooms[i]["players"] < 1) {
                    game.removeGame(rooms[i].id);
                    rooms.splice(i, 1);
                }
                break;
            }
        }
        clients.delete(ws);
  
        game.removePlayer(removeclient.room, removeclientid)
        gameevents.once("removePlayer" + removeclient.room, function(result) {
            //console.log(result);
        });

        //EVERYTHING BELOW HERE WILL BE SENT TO ALL MEMBERS OF A ROOM
        [...clients.keys()].forEach((client) => {
            let clientdata = clients.get(client);

            if(clientdata["room"] === removeclient.room) {
                //to simplify things a little
                function sendmsg(message) {
                    client.send(JSON.stringify(message));
                }

                rooms[i]["playerslist"] = rooms[i]["playerslist"].filter(function(item) {
                    return item.id !== removeclientid;
                });

                rooms[i]["playersconfirmed"] = rooms[i]["playersconfirmed"].filter(e => e !== removeclientid);

                sendmsg({"playerleft": removeclientid});
            }
        });
    });
});

process.on("uncaughtException", function(error) {
    console.log(error.stack);
});
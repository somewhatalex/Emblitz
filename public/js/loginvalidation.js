function checkPass(pass) {
    if(pass.length >=8 && pass.length <= 30) {
        document.getElementById("pswd_char").style.color = "rgb(59, 255, 108)";
        document.getElementById("pswd_char").innerHTML = `<I CLASS="fa fa-check"></I>`;
    } else {
        document.getElementById("pswd_char").style.color = "rgb(255, 59, 59)";
        document.getElementById("pswd_char").innerHTML = `<I CLASS="fa fa-times"></I>`;
    }

    if(pass.match(/[A-Z]/g)) {
        document.getElementById("pswd_upper").style.color = "rgb(59, 255, 108)";
        document.getElementById("pswd_upper").innerHTML = `<I CLASS="fa fa-check"></I>`;
    } else {
        document.getElementById("pswd_upper").style.color = "rgb(255, 59, 59)";
        document.getElementById("pswd_upper").innerHTML = `<I CLASS="fa fa-times"></I>`;
    }

    if(pass.match(/[a-z]/g)) {
        document.getElementById("pswd_lower").style.color = "rgb(59, 255, 108)";
        document.getElementById("pswd_lower").innerHTML = `<I CLASS="fa fa-check"></I>`;
    } else {
        document.getElementById("pswd_lower").style.color = "rgb(255, 59, 59)";
        document.getElementById("pswd_lower").innerHTML = `<I CLASS="fa fa-times"></I>`;
    }

    if(pass.match(/[0-9]/g)) {
        document.getElementById("pswd_number").style.color = "rgb(59, 255, 108)";
        document.getElementById("pswd_number").innerHTML = `<I CLASS="fa fa-check"></I>`;
    } else {
        document.getElementById("pswd_number").style.color = "rgb(255, 59, 59)";
        document.getElementById("pswd_number").innerHTML = `<I CLASS="fa fa-times"></I>`;
    }
}

function submitRegister() {
    for(let i=0; i<document.getElementsByClassName("lb_form_error").length; i++) {
        document.getElementsByClassName("lb_form_error")[i].style.display = "none";
    }

    var errors = false;

    if(!document.getElementById("i-email").value) {
        document.getElementById("error-email").style.display = "inline";
        document.getElementById("error-email").innerText = "email is required";
        errors = true;
    }
    
    let emailformatted = document.getElementById("i-email").value.match(
        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );

    if(!emailformatted && document.getElementById("i-email").value) {
        document.getElementById("error-email").style.display = "inline";
        document.getElementById("error-email").innerText = "please enter a valid email";
        errors = true;
    }

    if(document.getElementById("i-username").value.length <= 1) {
        document.getElementById("error-username").style.display = "inline";
        document.getElementById("error-username").innerText = "must be at least 2 characters long";
        errors = true;
    }

    if(!document.getElementById("i-username").value) {
        document.getElementById("error-username").style.display = "inline";
        document.getElementById("error-username").innerText = "username is required";
        errors = true;
    }

    if(!document.getElementById("i-password").value) {
        document.getElementById("error-password").style.display = "inline";
        document.getElementById("error-password").innerText = "password is required";
        errors = true;
    }

    if(document.getElementById("i-password").value.length <=8 && document.getElementById("i-password").value.length >= 30) {
        document.getElementById("error-password").style.display = "inline";
        document.getElementById("error-password").innerText = "password must meet requirements";
        errors = true;
    }

    if(!document.getElementById("i-password").value.match(/[A-Z]/g)) {
        document.getElementById("error-password").style.display = "inline";
        document.getElementById("error-password").innerText = "password must meet requirements";
        errors = true;
    }

    if(!document.getElementById("i-password").value.match(/[a-z]/g)) {
        document.getElementById("error-password").style.display = "inline";
        document.getElementById("error-password").innerText = "password must meet requirements";
        errors = true;
    }

    if(!document.getElementById("i-password").value.match(/[0-9]/g)) {
        document.getElementById("error-password").style.display = "inline";
        document.getElementById("error-password").innerText = "password must meet requirements";
        errors = true;
    }

    if(!errors) {
        document.getElementById("i-submit").value = "Please wait...";
        document.getElementById("i-submit").style.cursor = "no-drop";
        document.getElementById("i-submit").setAttribute("disabled", "disabled");
        document.getElementById("backtologin").setAttribute("disabled", "disabled");
        document.getElementById("backtologin").style.cursor = "no-drop";
        fetch("/authapi", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({action: "registeruser", email: document.getElementById("i-email").value, username: document.getElementById("i-username").value, password: document.getElementById("i-password").value})}).then(response => {
            response.json().then(function(text) {
                if(text.errors) {
                    document.getElementById("i-submit").removeAttribute("disabled");
                    document.getElementById("backtologin").removeAttribute("disabled");
                    document.getElementById("i-submit").style.cursor = "pointer";
                    document.getElementById("backtologin").style.cursor = "pointer";
                    document.getElementById("i-submit").value = "Register";

                    for(let i=0; i<document.getElementsByClassName("lb_form_error").length; i++) {
                        document.getElementsByClassName("lb_form_error")[i].style.display = "none";
                    }

                    //declared errors by server
                    if(text.errors.includes("u1")) {
                        document.getElementById("error-username").style.display = "inline";
                        document.getElementById("error-username").innerText = "must be at least 2 characters long";
                        errors = true;
                    } else if(text.errors.includes("u2")) {
                        document.getElementById("error-username").style.display = "inline";
                        document.getElementById("error-username").innerText = "must be less than 18 characters long";
                        errors = true;
                    }

                    if(text.errors.includes("u3")) {
                        document.getElementById("error-username").style.display = "inline";
                        document.getElementById("error-username").innerText = "another user already has this username";
                        errors = true;
                    }

                    if(text.errors.includes("e1")) {
                        document.getElementById("error-email").style.display = "inline";
                        document.getElementById("error-email").innerText = "email is required";
                        errors = true;
                    } else if(text.errors.includes("e2")) {
                        document.getElementById("error-username").style.display = "inline";
                        document.getElementById("error-username").innerText = "please enter a valid email";
                        errors = true;
                    }

                    if(text.errors.includes("e3")) {
                        document.getElementById("error-email").style.display = "inline";
                        document.getElementById("error-email").innerText = "this email is already taken";
                        errors = true;
                    }

                    if(text.errors.includes("p1")) {
                        document.getElementById("error-password").style.display = "inline";
                        document.getElementById("error-password").innerText = "password is required";
                        errors = true;
                    } else if(text.errors.includes("p2")) {
                        document.getElementById("error-password").style.display = "inline";
                        document.getElementById("error-password").innerText = "password must meet requirements";
                        errors = true;
                    }
                } else if(text.error == 429) {
                    document.getElementById("i-submit").removeAttribute("disabled");
                    document.getElementById("backtologin").removeAttribute("disabled");
                    document.getElementById("i-submit").style.cursor = "pointer";
                    document.getElementById("backtologin").style.cursor = "pointer";
                    document.getElementById("i-submit").value = "Register";
                    alert("You're trying to make an account too quickly! Please try again in a minute.");
                } else {
                    document.getElementById("mainarea").style.opacity = "0";
                    setTimeout(function() {
                        document.getElementById("mainarea").innerHTML = `
                            <DIV CLASS="homelogo"><IMG CLASS="lg_logo" SRC="./images/logo.png"></DIV>
                            <DIV CLASS="lg_resulttext">Please check your email for a verification email. Note that it will expire in 10 minutes, and any unverified accounts will be deleted in an hour. Try checking your spam and promotions tabs if you don't see the email. Still don't see it? Press the button below to resend the email.</DIV>
                            <BUTTON STYLE="margin-top: 20px;" CLASS="lg_register jb_gray" ID="i-resendemail" ONCLICK="resendemail()">Resend Verification Email</BUTTON>
                            <DIV CLASS="lg_resulttext" ID="lg_resendstatus" STYLE="display: none; margin-top: 10px"></DIV>
                            <DIV CLASS="lg_resulttext">Once you verified your email, click here to go to Emblitz.</DIV>
                            <BUTTON STYLE="margin-top: 20px;" CLASS="lg_register jb_green" ONCLICK="window.location='http://emblitz.com'">To Emblitz!</BUTTON>
                            `
                        document.getElementById("mainarea").style.opacity = "1";
                    }, 500);
                }
            })
        });
    }
}

function resendemail() {
    document.getElementById("i-resendemail").value = "Please wait...";
    document.getElementById("i-resendemail").style.cursor = "no-drop";
    document.getElementById("i-resendemail").setAttribute("disabled", "disabled");

    fetch("/authapi", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({action: "resendemail"})}).then(response => {
        response.json().then(function(text) {
            if(text.email) {
                document.getElementById("i-resendemail").removeAttribute("disabled");
                document.getElementById("i-resendemail").style.cursor = "pointer";
                document.getElementById("i-resendemail").value = "Resend Verification Email";
                document.getElementById("lg_resendstatus").style.display = "block";
                document.getElementById("lg_resendstatus").innerText = "Sent a copy of the email to " + text.email + "!";
            } else if(text.error === "lookup_1") {
                document.getElementById("i-resendemail").removeAttribute("disabled");
                document.getElementById("i-resendemail").style.cursor = "pointer";
                document.getElementById("i-resendemail").value = "Resend Verification Email";
                document.getElementById("lg_resendstatus").style.display = "block";
                document.getElementById("lg_resendstatus").innerText = "Error: account doesn't exist or was already verified.";
            } else {
                document.getElementById("i-resendemail").removeAttribute("disabled");
                document.getElementById("i-resendemail").style.cursor = "pointer";
                document.getElementById("i-resendemail").value = "Resend Verification Email";
                document.getElementById("lg_resendstatus").style.display = "block";
                document.getElementById("lg_resendstatus").innerText = "Error: you are not logged in.";
            }
        });
    });
}

function login() {
    document.getElementById("i-loginbtn").value = "Please wait...";
    document.getElementById("i-loginbtn").style.cursor = "no-drop";
    document.getElementById("i-loginbtn").setAttribute("disabled", "disabled");
    fetch("/authapi", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({action: "login", username: document.getElementById("login-username").value, password: document.getElementById("login-password").value})}).then(response => {
        response.json().then(function(text) {
            if(text.error) {
                if(text.error === "password is incorrect") {
                    
                } else if(text.error === "username does not exist") {

                } else if(text.error === "missing username") {

                } else if(text.error === "missing password") {

                } else if(text.error === "missing username and password") {

                }
                return;
            }

        });
    });
}
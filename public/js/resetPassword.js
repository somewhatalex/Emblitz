function clearResetErrors() {
    for (let i = 0; i < document.getElementsByClassName("lb_form_error").length; i++) {
        document.getElementsByClassName("lb_form_error")[i].style.display = "none";
        document.getElementsByClassName("lb_form_error")[i].innerText = "";
    }

    const status = document.getElementById("lg_resetstatus");
    if (status) {
        status.style.display = "none";
        status.innerText = "";
    }
}

function checkPass(pass, confirmPass) {
    if (pass.length >= 8 && pass.length <= 30) {
        document.getElementById("pswd_char").style.color = "rgb(59, 255, 108)";
        document.getElementById("pswd_char").innerHTML = `<I CLASS="fa fa-check"></I>`;
    } else {
        document.getElementById("pswd_char").style.color = "rgb(255, 59, 59)";
        document.getElementById("pswd_char").innerHTML = `<I CLASS="fa fa-times"></I>`;
    }

    if (/[A-Z]/.test(pass)) {
        document.getElementById("pswd_upper").style.color = "rgb(59, 255, 108)";
        document.getElementById("pswd_upper").innerHTML = `<I CLASS="fa fa-check"></I>`;
    } else {
        document.getElementById("pswd_upper").style.color = "rgb(255, 59, 59)";
        document.getElementById("pswd_upper").innerHTML = `<I CLASS="fa fa-times"></I>`;
    }

    if (/[a-z]/.test(pass)) {
        document.getElementById("pswd_lower").style.color = "rgb(59, 255, 108)";
        document.getElementById("pswd_lower").innerHTML = `<I CLASS="fa fa-check"></I>`;
    } else {
        document.getElementById("pswd_lower").style.color = "rgb(255, 59, 59)";
        document.getElementById("pswd_lower").innerHTML = `<I CLASS="fa fa-times"></I>`;
    }

    if (/[0-9]/.test(pass)) {
        document.getElementById("pswd_number").style.color = "rgb(59, 255, 108)";
        document.getElementById("pswd_number").innerHTML = `<I CLASS="fa fa-check"></I>`;
    } else {
        document.getElementById("pswd_number").style.color = "rgb(255, 59, 59)";
        document.getElementById("pswd_number").innerHTML = `<I CLASS="fa fa-times"></I>`;
    }

    if (pass === confirmPass && confirmPass.length > 0) {
        document.getElementById("pswd_match").style.color = "rgb(59, 255, 108)";
        document.getElementById("pswd_match").innerHTML = `<I CLASS="fa fa-check"></I>`;
    } else {
        document.getElementById("pswd_match").style.color = "rgb(255, 59, 59)";
        document.getElementById("pswd_match").innerHTML = `<I CLASS="fa fa-times"></I>`;
    }
}

function clientCheckPasswordErrors() {
    let errors = false;
    const password = document.getElementById("i-password").value;
    const confirmPassword = document.getElementById("i-password-confirm").value;

    if (!password) {
        document.getElementById("error-password").style.display = "inline";
        document.getElementById("error-password").innerText = "password is required";
        errors = true;
    } else {
        const meetsRequirements =
            password.length >= 8 &&
            password.length <= 30 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /[0-9]/.test(password);

        if (!meetsRequirements) {
            document.getElementById("error-password").style.display = "inline";
            document.getElementById("error-password").innerText = "password must meet requirements";
            errors = true;
        }
    }

    if (password !== confirmPassword) {
        document.getElementById("error-password").style.display = "inline";
        document.getElementById("error-password").innerText = "passwords must match";
        document.getElementById("error-passwordconfirm").style.display = "inline";
        document.getElementById("error-passwordconfirm").innerText = "passwords must match";
        errors = true;
    }

    return errors;
}

async function resetPassword(token) {
    clearResetErrors();

    const errors = clientCheckPasswordErrors();
    if (errors) return;

    const submitButton = document.getElementById("i-submit");
    const backToLoginButton = document.getElementById("backtologin");
    const status = document.getElementById("lg_resetstatus");
    const password = document.getElementById("i-password").value;

    submitButton.value = "Please wait...";
    submitButton.style.cursor = "no-drop";
    submitButton.setAttribute("disabled", "disabled");

    backToLoginButton.setAttribute("disabled", "disabled");
    backToLoginButton.style.cursor = "no-drop";

    try {
        const response = await fetch("/auth2", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "finishPasswordReset",
                token: token,
                password: password
            })
        });

        const text = await response.json();

        if (response.status === 429) {
            submitButton.removeAttribute("disabled");
            backToLoginButton.removeAttribute("disabled");
            submitButton.style.cursor = "pointer";
            backToLoginButton.style.cursor = "pointer";
            submitButton.value = "Reset Password";
            alert("You're trying too quickly. Please try again in 5 minutes.");
            return;
        }

        if (text.errors) {
            submitButton.removeAttribute("disabled");
            backToLoginButton.removeAttribute("disabled");
            submitButton.style.cursor = "pointer";
            backToLoginButton.style.cursor = "pointer";
            submitButton.value = "Reset Password";

            if (text.errors.includes("p1")) {
                document.getElementById("error-password").style.display = "inline";
                document.getElementById("error-password").innerText = "password is required";
            } else if (text.errors.includes("p2")) {
                document.getElementById("error-password").style.display = "inline";
                document.getElementById("error-password").innerText = "password must meet requirements";
            }

            return;
        }

        if (text.error === "invalid_or_expired") {
            submitButton.removeAttribute("disabled");
            backToLoginButton.removeAttribute("disabled");
            submitButton.style.cursor = "pointer";
            backToLoginButton.style.cursor = "pointer";
            submitButton.value = "Reset Password";

            if (status) {
                status.style.display = "block";
                status.innerText = "This reset link is invalid or expired.";
            } else {
                alert("This reset link is invalid or expired.");
            }

            return;
        }

        document.getElementById("mainarea").style.opacity = "0";
        setTimeout(function() {
            document.getElementById("mainarea").innerHTML = `
                <DIV CLASS="homelogo"><IMG CLASS="lg_logo" SRC="./images/logo.png"></DIV>
                <DIV CLASS="lg_resulttext">Your password has been successfully reset!</DIV>
                <DIV CLASS="lg_resulttext">Click below to go to Emblitz and log in with your new password.</DIV>
                <BUTTON STYLE="margin-top: 20px;" CLASS="lg_register jb_green" ONCLICK="window.location='./login'">To Login</BUTTON>
            `;
            document.getElementById("mainarea").style.opacity = "1";
        }, 500);
    } catch (err) {
        console.error(err);

        submitButton.removeAttribute("disabled");
        backToLoginButton.removeAttribute("disabled");
        submitButton.style.cursor = "pointer";
        backToLoginButton.style.cursor = "pointer";
        submitButton.value = "Reset Password";

        if (status) {
            status.style.display = "block";
            status.innerText = "A network error occurred. Please try again.";
        } else {
            alert("A network error occurred. Please try again.");
        }
    }
}

setInterval(() => {
    let passwordField = document.getElementById('i-password');
    let passwordConfirmField = document.getElementById('i-password-confirm');

    if (passwordField != null && passwordConfirmField != null) {
        checkPass(passwordField.value, passwordConfirmField.value);
    }
}, 200);
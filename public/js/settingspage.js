var deviceSettings = {};

window.addEventListener("load", function() {
    setAvatarColor();
    setColor(playercolor, document.getElementById(playercolor + "-colorselect"));
    getDeviceSettings();
});

function setAvatarColor() {
    document.getElementById("avatar-frame").style.border = "5px solid " + playercolor;
    document.getElementById("avatar-frame").style.background = colorData[playercolor].normal;
}

function getDeviceSettings() {
    if(localStorage.getItem("devicesettings")) {
        deviceSettings = JSON.parse(localStorage.getItem("devicesettings"));

        let checkboxes = document.getElementsByClassName("DSvalue");
        for(let i=0; i<checkboxes.length; i++) {
            checkboxes[i].checked = deviceSettings[checkboxes[i].id];
        }

        let sliders = document.getElementsByClassName("DSslider");
        for(let i=0; i<sliders.length; i++) {
            sliders[i].value = deviceSettings[sliders[i].id];
        }

        //update slider values
        updateAudioSlider();
    }
}

function setColor(color, button) {
    playercolor = color;
    let colorbuttons = document.getElementsByClassName("s-cs-button");
    for (let i = 0; i < colorbuttons.length; i++) {
        colorbuttons[i].classList.remove("cs-selected");
    }
    button.classList.add("cs-selected");

    setAvatarColor();
}

function notification(type, title, content, persisttime) {
    let toastcolor = "";
    let currenttoast = document.createElement("div");
    currenttoast.className = "notification";
    currenttoast.style.right = "-320px";
    
    if(type === "warn") {
        toastcolor = "#dae813";
    } else if(type === "notify") {
        toastcolor = "#1356e8";
    } else if(type === "error") {
        toastcolor = "#e81313";
    }
    
    currenttoast.innerHTML = `<DIV CLASS="notification-bg" STYLE="border-left: 5px solid ${toastcolor}"></DIV>
    <DIV CLASS="notification-inner">
        <DIV CLASS="notification-title" ID="note-title">${title}</DIV>
        <DIV CLASS="notification-content" ID="note-content">${content}</DIV>
    </DIV>`

    document.getElementById("notifications").appendChild(currenttoast);

    setTimeout(function() {
        currenttoast.style.right = "0px";
    }, 10);

    setTimeout(function() {
        currenttoast.style.right = "-320px";
        setTimeout(function() {
            currenttoast.remove();
        }, 300)
    }, persisttime*1000);
}

function submitUserSettings() {
    if(playercolor !== or_playercolor) {
        editPlayerColor(playercolor);
    } else {
        notification("notify", "Saved changes", "Your changes were successfully saved!", 5);
    }

    let checkboxes = document.getElementsByClassName("DSvalue");
    for(let i=0; i<checkboxes.length; i++) {
        deviceSettings[checkboxes[i].id] = checkboxes[i].checked;
    }

    let sliders = document.getElementsByClassName("DSslider");
    for(let i=0; i<sliders.length; i++) {
        deviceSettings[sliders[i].id] = sliders[i].value;
    }

    localStorage.setItem("devicesettings", JSON.stringify(deviceSettings));
}

function editPlayerColor(color) {
    document.getElementById("save-button").innerText = "Saving...";
    document.getElementById("save-button").setAttribute("disabled", "disabled");
    document.getElementById("save-button").style.cursor = "no-drop";
    fetch("/api", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({action: "editplayercolor", color: color})}).then(response => {
        response.json().then(function(result) {
            document.getElementById("save-button").innerText = "Save changes";
            document.getElementById("save-button").removeAttribute("disabled");
            document.getElementById("save-button").style.cursor = "pointer";

            if(response.status == 429) {
                console.error("[SETTINGS] Error: invalid parameters");
                
                notification("error", "Error saving changes", "You're saving your changes too quickly! Please try again in a minute.", 4);
                return;
            }
            console.log("[SETTINGS] Updated player color");

            or_playercolor = color;

            notification("notify", "Saved changes", "Your changes were successfully saved!", 3);
        });
    });
};

function updateAudioSlider() {
    let sliderValue = document.getElementById("audio-volume").value;
    document.getElementById("audiodisplay").innerText = sliderValue + "%";
}

window.addEventListener("beforeunload", function (e) {
    let unsavedchanges = false;

    if(or_playercolor !== playercolor) {
        unsavedchanges = true;
    }

    let checkboxes = document.getElementsByClassName("DSvalue");
    for(let i=0; i<checkboxes.length; i++) {
        deviceSettings[checkboxes[i].id] = checkboxes[i].checked;
    }

    let sliders = document.getElementsByClassName("DSslider");
    for(let i=0; i<sliders.length; i++) {
        deviceSettings[sliders[i].id] = sliders[i].value;
    }

    if(localStorage.getItem("devicesettings") !== JSON.stringify(deviceSettings)) unsavedchanges = true;

    console.log(unsavedchanges)

    if(unsavedchanges) {
        var confirmationMessage = "You still have unsaved settings! If you leave the page, they'll be lost. Are you sure?";

        (e || window.event).returnValue = confirmationMessage
        return confirmationMessage;
    }
});

function promptLogout() {
    document.getElementById("logout-confirm").style.display = "block";
    setTimeout(function() {
        document.getElementById("logout-confirm").style.opacity = 1;
    }, 50);
}

function promptAccountDeletion() {
    document.getElementById("delete-account-confirm").style.display = "block";
    setTimeout(function() {
        document.getElementById("delete-account-confirm").style.opacity = 1;
    }, 50);
}

window.onclick = function(event) {
    if (event.target === document.getElementById("logout-confirm") || event.target === document.getElementById("lc-exit") || event.target === document.getElementById("cancellogout")) {
        document.getElementById("logout-confirm").style.display = "none";
        document.getElementById("logout-confirm").style.opacity = 0;
    }

    if (event.target === document.getElementById("delete-account-confirm") || event.target === document.getElementById("dac-exit") || event.target === document.getElementById("cancelDeletionRequest")) {
        document.getElementById("delete-account-confirm").style.display = "none";
        document.getElementById("delete-account-confirm").style.opacity = 0;
    }
}

function logoutUser() {
    document.getElementById("logout-confirm").style.opacity = 0;
    document.getElementById("logout-confirm").style.display = "none";
    notification("notify", "Logging out...", "Logging you out, please wait.", 100);

    fetch("/api", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({action: "logoutuser"})}).then(function() {
        window.location.href = "../";
    });
}

async function requestAccountDeletion() {
    const deleteButton = document.getElementById("confirm-account-deletion-btn");

    if (deleteButton) {
        deleteButton.innerText = "Please wait...";
        deleteButton.setAttribute("disabled", "disabled");
        deleteButton.style.cursor = "no-drop";
    }

    try {
        const response = await fetch("/auth2", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                action: "requestAccountDeletion"
            })
        });

        const text = await response.json();

        if (response.status === 429 || text.error === 429) {
            if (typeof notification === "function") {
                notification("error", "Too many requests", "Please wait a few minutes before trying again.", 4);
            } else {
                alert("Please wait a few minutes before trying again.");
            }
            return;
        }

        if (text.error === "not_logged_in") {
            if (typeof notification === "function") {
                notification("error", "Not logged in", "You must be logged in to request account deletion.", 4);
            } else {
                alert("You must be logged in to request account deletion.");
            }
            return;
        }

        if (text.error === "server_1") {
            if (typeof notification === "function") {
                notification("error", "Server error", "Something went wrong. Please try again.", 4);
            } else {
                alert("Something went wrong. Please try again.");
            }
            return;
        }

        if (text.ok) {
            if (typeof notification === "function") {
                notification(
                    "notify",
                    "Check your email",
                    "We sent an account deletion confirmation link to your account email address. It expires in 10 minutes.",
                    6
                );
            } else {
                alert("We sent an account deletion confirmation link to your account email address. It expires in 10 minutes.");
            }
        }
    } catch (err) {
        console.error(err);

        if (typeof notification === "function") {
            notification("error", "Network error", "Could not contact the server. Please try again.", 4);
        } else {
            alert("Could not contact the server. Please try again.");
        }
    } finally {
        if (deleteButton) {
            deleteButton.removeAttribute("disabled");
            deleteButton.style.cursor = "pointer";
            deleteButton.innerText = "Yes, request account deletion";
        }
    }
}
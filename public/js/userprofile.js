var badges = null;

window.addEventListener("load", function() {
    fetch("/api", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({action: "badgedata"})}).then(response => {
        response.json().then(function(badgeresult) {
            badges = badgeresult;
            fetch("/api", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({action: "getuserprofile", username: username})}).then(response => {
                response.json().then(function(result) {
                    loadProfile(result);
                });
            });
        });
    });
});

function epochToDate(epochtime) {
    let datecreated = new Date(Number(epochtime));
    return datecreated.getMonth() + "/" + datecreated.getDate() + "/" + datecreated.getFullYear().toString().slice(2, 4);
}

function loadProfile(info) {
    document.getElementById("wins-amount").innerText = info.medals;
    document.getElementById("gamesplayed-amount").innerText = Number(info.wins) + Number(info.losses);

    document.getElementById("join-date").innerText = epochToDate(info.timecreated);

    document.getElementById("up-wins").innerText = info.wins;
    document.getElementById("up-losses").innerText = info.losses;
    document.getElementById("up-rate").innerText = ((info.wins/(info.wins + info.losses)) * 100).toFixed(2);

    let userbadges = JSON.parse(info.badges);
    let userbadgenames = Object.keys(userbadges);

    document.getElementById("u-badge-count").innerText = userbadgenames.length;

    for(let i=0; i < 6; i++) {
        let currentBadgeType;
        switch(i) {
            case 0:
                currentBadgeType = "Uranium";
                break;
            case 1:
                currentBadgeType = "Ruby";
                break;
            case 2:
                currentBadgeType = "Diamond";
                break;
            case 3:
                currentBadgeType = "Gold";
                break;
            case 4:
                currentBadgeType = "Silver";
                break;
            default:
                currentBadgeType = "Bronze";
                break;
        }
        
        for(let i=0; i<userbadgenames.length; i++) {
            if(badges[userbadgenames[i]].level == currentBadgeType) {
                let levelcolor = null;
                let badgelevel = badges[userbadgenames[i]].level;
                if(badgelevel === "Uranium") {
                    levelcolor = "#5ebb0e";
                } else if(badgelevel === "Ruby") {
                    levelcolor = "#e0113a";
                } else if(badgelevel === "Diamond") {
                    levelcolor = "#1fb8db";
                } else if(badgelevel === "Gold") {
                    levelcolor = "#cfb31c";
                } else if(badgelevel === "Silver") {
                    levelcolor = "#808080";
                } else if(badgelevel === "Bronze") {
                    levelcolor = "#cd7f32"
                }
                document.getElementById("badge-container").innerHTML += `
                <DIV CLASS="u-badge">
                    <DIV CLASS="u-badge-icon"><IMG CLASS="u-badge-img" SRC="../images/badges/${badges[userbadgenames[i]].image}"></DIV>
                    <DIV STYLE="padding: 15px;">
                        <DIV CLASS="u-badge-card-title">${badges[userbadgenames[i]].name}</DIV>
                        <SPAN CLASS="u-badge-level" STYLE="background: ${levelcolor}">${badgelevel}</SPAN><SPAN CLASS="u-badge-card-awarded"> Awarded ${epochToDate(userbadges[userbadgenames[i]].awarded)}</SPAN>
                        <DIV CLASS="u-badge-card-description">
                            ${badges[userbadgenames[i]].description}
                        </DIV>
                    </DIV>
                </DIV>
                `
            }
        }
    }
}
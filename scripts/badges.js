//for badge storage
const badges = {
    //note: as of 4/29/23 (long overdue), this badge is no longer obtainable
    "betatester": {
        "name": "Beta Tester",
        "level": "Silver",
        "description": "Beta test the game and its features early on by creating an account when the game first came out.",
        "image": "betatester.png"
    },

    "verifiedaccount": {
        "name": "Verified Account",
        "level": "Bronze",
        "description": "Create an Emblitz account and verify it.",
        "image": "verifiedaccount.png"
    },

    //developer badge
    "developer": { //Placeholder info
        "name": "Developer",
        "level": "Silver",
        "description": "Contribute to the game\'s development.",
        "image": "developer.png"
    },

    //win count badges
    "firstwin": {
        "name": "First Win",
        "level": "Bronze",
        "description": "Win your first Emblitz battle in a public multiplayer room! Defeat all other players and place 1st to receive this badge.",
        "image": "firstwin.png"
    },

    "5wins": {
        "name": "5 Wins",
        "level": "Silver",
        "description": "Win 5 Emblitz battles in public multiplayer rooms!",
        "image": "5wins.png"
    },

    "10wins": {
        "name": "10 Wins",
        "level": "Gold",
        "description": "Win 10 Emblitz battles in public multiplayer rooms!",
        "image": "10wins.png"
    },

    "20wins": {
        "name": "20 Wins",
        "level": "Diamond",
        "description": "Win 20 Emblitz battles in public multiplayer rooms!",
        "image": "20wins.png"
    },

    "50wins": {
        "name": "50 Wins",
        "level": "Ruby",
        "description": "Win 50 Emblitz battles in public multiplayer rooms!",
        "image": "50wins.png"
    },

    //troop count badges
    "50troops_territory": {
        "name": "Battle Call",
        "level": "Bronze",
        "description": "Amass 50 troops in a single territory.",
        "image": "50wins.png"
    },

    "100troops_territory": {
        "name": "Recruiter",
        "level": "Silver",
        "description": "Amass 100 troops in a single territory.",
        "image": "50wins.png"
    },

    "500troops_territory": {
        "name": "Bold Leader",
        "level": "Gold",
        "description": "Amass 500 troops in a single territory.",
        "image": "50wins.png"
    },

    "1500troops_territory": {
        "name": "Unstoppable Force",
        "level": "Diamond",
        "description": "Amass 1500 troops in a single territory.",
        "image": "50wins.png"
    },

    "3000troops_territory": {
        "name": "Legendary Army",
        "level": "Ruby",
        "description": "Amass 3000 troops in a single territory.",
        "image": "50wins.png"
    },

    //total troop count badges
    "200totaltroops": {
        "name": "Village Chief",
        "level": "Bronze",
        "description": "Have a maximum of 200 troops in one game.",
        "image": "50wins.png"
    },

    "500totaltroops": {
        "name": "Town Mayor",
        "level": "Silver",
        "description": "Have an maximum of 500 troops in one game.",
        "image": "50wins.png"
    },

    "1000totaltroops": {
        "name": "Governor",
        "level": "Gold",
        "description": "Have an maximum of 1000 troops in one game.",
        "image": "50wins.png"
    },

    "3000totaltroops": {
        "name": "President",
        "level": "Diamond",
        "description": "Have an maximum of 3000 troops in one game.",
        "image": "50wins.png"
    },

    "10000totaltroops": {
        "name": "Empire Builder",
        "level": "Ruby",
        "description": "Have an maximum of 10000 troops in one game.",
        "image": "50wins.png"
    },

    //challenges
    "expertplayer": {
        "name": "Expert Player",
        "level": "Uranium",
        "description": "Become one of the top 10 players on the leaderboard at any point in time.",
        "image": "expertplayer.png"
    },

    "thegoat": {
        "name": "The GOAT",
        "level": "Uranium",
        "description": "Become one of the top 3 players on the leaderboard at any point in time.",
        "image": "thegoat.png"
    },

    "diplomat": {
        "name": "Diplomat",
        "level": "Gold",
        "description": "Host 20 private games and invite other players to join. Only completed games count.",
        "image": "diplomat.png"
    },

    //powerup mastery badges
    "newbiepilot": {
        "name": "Newbie Pilot",
        "level": "Bronze",
        "description": "Airlift a total of 747 troops.",
        "image": "newbiepilot.png"
    },

    "veteranpilot": {
        "name": "Veteran Pilot",
        "level": "Diamond",
        "description": "Airlift a total of 15000 troops.",
        "image": "veteranpilot.png"
    },

    "pyromaniac": {
        "name": "Pyromaniac",
        "level": "Silver",
        "description": "Drop a total of 50 nukes.",
        "image": "pyromaniac.png"
    },

    "thebigbang": {
        "name": "The Big Bang",
        "level": "Diamond",
        "description": "Drop a total of 1000 nukes.",
        "image": "thebigbang.png"
    },

    "collateraldamage": {
        "name": "Collateral Damage",
        "level": "Gold",
        "description": "Kill a total of 1000 of your own troops due to friendly fire from nukes.",
        "image": "collateraldamage.png"
    },

    "expertlogistics": {
        "name": "Expert Logistics",
        "level": "Bronze",
        "description": "Use the supply drop powerup 15 times.",
        "image": "expertlogistics.png"
    },

    "operationemblitz": {
        "name": "Operation Emblitz",
        "level": "Diamond",
        "description": "Use the supply drop powerup 2000 times.",
        "image": "operationemblitz.png"
    },

    "misinput": {
        "name": "IT WAS A MISINPUT!",
        "level": "Gold",
        "description": "Accidentally drop supplies in enemy territories 20 times.",
        "image": "misinput.png"
    },

    //total medal count badges
    "25medals": {
        "name": "Private",
        "level": "Bronze",
        "description": "Reach 25 Emblitz medals.",
        "image": "50wins.png"
    },

    "50medals": {
        "name": "Corporal",
        "level": "Silver",
        "description": "Reach 50 Emblitz medals.",
        "image": "50wins.png"
    },

    "150medals": {
        "name": "Sergeant",
        "level": "Gold",
        "description": "Reach 150 Emblitz medals.",
        "image": "50wins.png"
    },

    "800medals": {
        "name": "Lieutenant",
        "level": "Diamond",
        "description": "Reach 800 Emblitz medals.",
        "image": "50wins.png"
    },

    "2000medals": {
        "name": "Captain",
        "level": "Ruby",
        "description": "Reach 2000 Emblitz medals.",
        "image": "50wins.png"
    },

    "4500medals": {
        "name": "RadioactiveBox",
        "level": "Uranium",
        "description": "Reach 4500 Emblitz medals. Named after the #1 Emblitz player when the leaderboard first came out (RadioactiveBox).",
        "image": "4500medals.png"
    }
}

module.exports = badges;
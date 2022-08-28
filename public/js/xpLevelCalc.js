function getXpLevel(xp) {
    return Math.floor(/*xpToLevelEquation(xp)*/);
}

function getXpFromLevel(level){ //Inverse
    return Math.round(Math.pow(2, (level*.1))*level);
}

function xpUntilNextLevel(xp, level) {
    return Math.ceil(/*xpToLevelEquation(xp)*/)
}

function getRemainderXP(xp, level){

}

//I AM DIENG OF SLEEP DEPRIVATION PLZ HELP ME
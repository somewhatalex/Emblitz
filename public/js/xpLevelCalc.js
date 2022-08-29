function getXpLevel(xp) {
    return Math.floor(2*Math.sqrt(xp));
}

function getXpFromLevel(level){ //Inverse
    return Math.round((level*level)/4);
}

function xpUntilNextLevel(xp, level) {
    return getXpFromLevel(level+1)-xp+1;
}

function getRemainderXP(xp, level){
    return xp-getXpFromLevel(level);
}
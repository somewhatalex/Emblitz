function getLevelFromXp(xp) {
    return Math.floor(-1 + Math.sqrt(xp+4));
}

function getXpFromLevel(level){
    return Math.round(Math.pow(level, 2) + (2*level) - 3);
}

function xpToNextLevel(level) {
    return Math.round(getXpFromLevel(level+1)-getXpFromLevel(level))
}

function getRemainderXP(xp, level){
    return xp-getXpFromLevel(level);
}
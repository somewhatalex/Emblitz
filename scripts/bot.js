const fs = require("fs");
let movesArray //Pls make this a 2 dimensional array which each element contains a string for the starting territory and which one it can move to
//for example ["ae bc", "bc de", "de ab"] would become
/*
["ae", "bc" //Element 1 //Each element is an array of 2 strings
"bc", "de" //Element 2
"de", "ab" //Element 3
]
*/

let ownedTerritories; //Territories owned by the bot

function rallyTroops(){
  
}

let counter = 0;

//Finds the best path from one territory to another
function pathFindToTerritory(moves, startTerritory, targetTerritory){
  let path;
  path[0]=start;
  let possibleSolutions;
  let workingVariable;
  let shortestPath;
  let shortestPathLength = Infinity;
  while(counter < moves.length){
    for(i=0;i<path.length;i++){
      for(x=0;x<moves.length;x++){
        if(moves[x][0] == path[i][(path[i].length - 1)]){
          workingVariable = path[i];
          pathList.push(moves[x][1]);
        }if(moves[x][1] == target){
          possibleSolutions.push(workingVariable);
        }
      }
    }
    counter++;
  }
  for(y=0;y<possibleSolutions.length;y++){
    workingVariable = 0;
    for(z=0;z<possibleSolutions[y].length;y++){
      workingVariable += possibleSolutions[y][z].troopCount;
    }
    if(workingVariable<shortestPathLength){
      shortestPathLength = workingVariable;
      shortestPath = possibleSolutions[y];
    }
  }
  return shortestPath
}

//Finds a path to the territory which it is attacking
/*function pathFindToTerritory(moves, startTerritory, targetTerritory){
  while(smallestPath < shortestPath.length){
    let pathList;//Array for path lists being created
    pathList[0] = start;
    let completedPathList;//Array of paths which make it to the target
    let workingVariable;//variable currently being operated on
    for(i=0;i<pathList.length;i++){//Goes through all items in the path list
      for(x=0;x<moves.length;x++){//adds a new path if it is possible to go there
        if(moves[x][0] == path[i][(path[i].length - 1)]){
          workingVariable = path[i];
          pathList.push(moves[x][1]);
        }{
          if(moves[x][1] == target){
            completedPathList.push(workingVariable);
            for()
          }
        }
      }
    }
    counter++;
  }
}*/
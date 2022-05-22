#include <iostream>
#include <cstdlib>
#include <ctime>
#include <fstream>
#include <string>
#include "player.h"
#include "region.h"

//Get information needed from the file
void getFileInfo() {
	std::string file_input; //Variable for items gotten from the file
	std::ifstream map_data_file("map_data.dat"); //Creates an object for the map file
	
	//Loops while there is still file left to read
	while (!map_data_file.eof()) {
		getline(map_data_file, file_input); // Gets a new line from the file

		//If the line is just # then create a new region
		if (file_input == "#") {
			getline(map_data_file, file_input);
			//Add code to create the new region from file_input
		}
	}
}

//Generate a random number within the max and min range which it is given when it is called
int randIntGen(int min, int max) {
	int randNum = (rand() % (max - min + 1)) + min;
	return randNum;
}

//attacking a territory
std::string attack(std::string attacker_ID, int& attacker_army_size, std::string defender_ID, int& defender_army_size) {
	int attacker_roll;
	int defender_roll;

	//Loops so long as both players are still alive
	while (attacker_army_size > 0 && defender_army_size > 0) {
		//Rolls the dice, checks who won, and deducts the loser
		attacker_roll = randIntGen(1, 6);
		defender_roll = randIntGen(1, 6);
		if (attacker_roll > defender_roll) {
			defender_army_size--;
		}
		else {
			attacker_army_size--;
		}
	}

	//Returns the ID of the victor
	if (attacker_army_size <= 0) {
		return defender_ID;
	}
	else {
		return attacker_ID;
	}
}



int main() {
	//Filler
	return 0;
}
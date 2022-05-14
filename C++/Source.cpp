#include <iostream>
#include <cstdlib>
#include <ctime>
#include "player.h"

//Generate a random number within the max and min range which it is given when it is called
int randIntGen(int min, int max) {
	int randNum = (rand() % (max - min + 1)) + min;
	return randNum;
}

//attacking a territory
std::string attack(std::string attacker_ID, int& attacker_army_size, std::string defender_ID, int& defender_army_size) {
	int attacker_roll;
	int defender_roll;
	while (attacker_army_size > 0 && defender_army_size > 0) {
		attacker_roll = randIntGen(1, 6);
		defender_roll = randIntGen(1, 6);
		if (attacker_roll > defender_roll) {
			defender_roll--;
		}
		else {
			attacker_roll--;
		}
	}
	//Returns the ID of the victor
	if (attacker_roll <= 0) {
		return defender_ID;
	}
	else {
		return attacker_ID;
	}
}



int main() {
	std::string input;
	player playerObject;
	std::cout << "Emba Risk Clone Alpha 1.0.0 Server\n";
	std::cout << "Enter a player name: ";
	std::cin >> input;
	playerObject.setName(input);
	std::cout << "\nYour name is " << playerObject.getName() << ".\n";
	for (short x = 0; x < 1000; x++) {
		std::cout << randIntGen(1, 6) << std::endl;
	}
	return 0;
}
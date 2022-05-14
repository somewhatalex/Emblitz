#include "player.h"
#include <iostream>

void player::setName(std::string input) {
	name = input;
};

std::string player::getName(){
	return name;
};

void player::setColor(std::string input){
	color = input;
};

std::string player::getColor() {
	return color;
};
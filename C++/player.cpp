#include "player.h"
#include <iostream>

void player::set_player_ID(std::string input) {
	player_ID = input;
};

std::string player::get_player_ID() {
	return player_ID;
};

void player::set_name(std::string input) {
	name = input;
};

std::string player::get_name(){
	return name;
};

void player::set_color(std::string input){
	color = input;
};

std::string player::get_color() {
	return color;
};
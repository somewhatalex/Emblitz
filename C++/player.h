#ifndef PLAYER_H
#define PLAYER_H
#include <ostream>

//This is a class for each risk player who joins

class player
{
public:
	void set_player_ID(std::string input);
	std::string get_player_ID();
	void set_name(std::string input);
	std::string get_name();
	void set_color(std::string input);
	std::string get_color();
private:
	std::string player_ID = "";
	std::string name = "";
	std::string color = "";
};
#endif
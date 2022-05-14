#ifndef PLAYER_H
#define PLAYER_H
#include <ostream>

//This is a class for each risk player who joins

class player
{
public:
	void setName(std::string input);
	std::string getName();
	void setColor(std::string input);
	std::string getColor();
private:
	std::string name = "null";
	std::string color = "null";
	std::string user_ID;
};
#endif
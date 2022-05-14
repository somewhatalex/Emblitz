#ifndef PLAYER_H
#define PLAYER_H
#include <ostream>

class region
{
public:
	void set_region_ID(std::string input);
	std::string get_region_ID();
	void set_troop_count(int input);
	int get_troop_count();
private:
	std::string region_ID;
	int troop_count;
};
#endif

#ifndef PLAYER_H
#define PLAYER_H
#include <ostream>
#include <vector>

class region
{
public:
	void set_region_ID(std::string input);
	std::string get_region_ID();
	void set_neighboring_region(std::string input, int array_position);
	std::string get_neighboring_region(int array_position);
	int get_neigbor_array_size();
	void set_troop_count(int input);
	int get_troop_count();
private:
	std::string region_ID;
	std::vector<std::string> neighbouring_regions;
	int troop_count;
};
#endif
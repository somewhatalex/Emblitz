#include "region.h"
#include <iostream>
#include <vector>

void region::set_region_ID(std::string input) {
	region_ID = input;
}
std::string region::get_region_ID() {
	return region_ID;
}
void region::set_neighboring_region(std::string input, int array_position) {
	neighbouring_regions[array_position] = input;
}
std::string region::get_neighboring_region(int array_position) {
	return neighbouring_regions[array_position];
}
int region::get_neigbor_array_size() {
	return neighbouring_regions.size();
}
void region::set_troop_count(int input) {
	troop_count = input;
}
int region::get_troop_count() {
	return troop_count;
}
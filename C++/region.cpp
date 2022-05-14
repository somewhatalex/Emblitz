#include "region.h"
#include <iostream>

void region::set_region_ID(std::string input) {
	region_ID = input;
}
std::string region::get_region_ID() {
	return region_ID;
}
void region::set_troop_count(int input) {
	troop_count = input;
}
int region::get_troop_count() {
	return troop_count;
}
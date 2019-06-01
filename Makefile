geodesic-svg.js: geodesic-svg.cc
	em++ -Wall -Wextra -std=c++17 -flto -O3 -s ENVIRONMENT=worker -o geodesic-svg.js geodesic-svg.cc

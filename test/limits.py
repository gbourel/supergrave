# Test for x and y limits

# "\n" for program or "|" for url parameter
separator="\n"

import math

program = [];

# Initialisation
program.append("INIT")

# Grave un cercle
center = (765, 765)
radius = 765
steps = 12

for i in range(steps + 1):
  angle = (2*math.pi / steps) * i
  if i == 1 :
    program.append("LASER ON")
  pt = (round(center[0] + math.cos(angle)*radius),
        round(center[1] + math.sin(angle)*radius))
  program.append("MOVE " + str(pt[0]) + " " + str(pt[1]))

program.append("LASER OFF")
program.append("MOVE 2000 765")
program.append("LASER ON")
program.append("MOVE 2000 2000")
program.append("MOVE 0 0")

print(*program, sep=separator)

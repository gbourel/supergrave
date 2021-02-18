# Test for small distance between points

import math

# Initialisation
print("INIT")

# Grave un cercle
center = (500, 500)
radius = 200
steps = 500

for i in range(steps + 1):
  angle = (2*math.pi / steps) * i
  if i == 1 :
    print("LASER ON")
  pt = (round(center[0] + math.cos(angle)*radius),
        round(center[1] + math.sin(angle)*radius))
  print("MOVE", pt[0], pt[1])

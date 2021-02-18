# Test for x and y limits

import math

# Initialisation
print("INIT")

# Grave un cercle
center = (765, 765)
radius = 765
steps = 12

for i in range(steps + 1):
  angle = (2*math.pi / steps) * i
  if i == 1 :
    print("LASER ON")
  pt = (round(center[0] + math.cos(angle)*radius),
        round(center[1] + math.sin(angle)*radius))
  print("MOVE", pt[0], pt[1])

print("LASER OFF")
print("MOVE 2000 765")
print("LASER ON")
print("MOVE 2000 2000")
print("MOVE 0 0")

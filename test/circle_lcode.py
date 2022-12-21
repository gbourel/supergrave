# Basic test which draws a rectangle, a line and a circle

import math

# Initialisation
print("INIT")
print("MOVE 150 150")

# Grave un rectangle
print("LASER ON")
print("MOVE 650 150")
print("MOVE 650 750")
print("MOVE 150 750")
print("MOVE 150 150")
print("LASER OFF")

# Test du mode relatif
print("MOVE 750 150")
print("LASER ON")
print("MODE REL")
print("MOVE 200 500")
print("LASER OFF")
print("MODE ABS")

# Grave un cercle
center = (1500, 500)
radius = 250
steps = 24

for i in range(steps + 1):
  angle = (2*math.pi / steps) * i
  if i == 1 :
    print("LASER ON")
  pt = (round(center[0] + math.cos(angle)*radius),
        round(center[1] + math.sin(angle)*radius))
  print("MOVE", pt[0], pt[1])

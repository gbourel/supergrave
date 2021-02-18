# Basic test for high precision mode

import math

# Initialisation
print("INIT")
print("HIPRE ON")
print("MOVE 15000 15000")

# Grave un rectangle
print("LASER ON")
print("MOVE 65000 15000")
print("MOVE 65000 75000")
print("MOVE 15000 75000")
print("MOVE 15000 15000")
print("LASER OFF")

# Test du mode relatif
print("MOVE 75000 15000")
print("LASER ON")
print("MODE REL")
print("MOVE 20000 50000")
print("LASER OFF")
print("MODE ABS")

# Grave un cercle
center = (150000, 50000)
radius = 25000
steps = 24

for i in range(steps + 1):
  angle = (2*math.pi / steps) * i
  if i == 1 :
    print("LASER ON")
  pt = (round(center[0] + math.cos(angle)*radius),
        round(center[1] + math.sin(angle)*radius))
  print("MOVE", pt[0], pt[1])

# Basic test which draws a rectangle, a line and a circle

import math

# Initialisation
print("%")
print("G21 G90")          # mm, absolu
print("G00 X150 Y150")

# Grave un rectangle
print("M03")
print("G01 X650 Y150 F400")
print("G01 X650 Y750")
print("G01 X150 Y750")
print("G01 X150 Y150")
print("M05")

# Test du mode relatif
print("G00 X750 Y150")
print("G03")
print("G91")
print("G01 X200 Y500")
print("G05")
print("G90")

# Grave un cercle
center = (1500, 500)
radius = 250
steps = 24
move_cmd = "G00"
speed = ""

for i in range(steps + 1):
  angle = (2*math.pi / steps) * i
  if i == 1 :
    move_cmd = "G01"
    speed = "F1200"
    print("M03")
  if i == 2:
    speed = ""
  pt = (round(center[0] + math.cos(angle)*radius),
        round(center[1] + math.sin(angle)*radius))
  print(f"{move_cmd} X{pt[0]} Y{pt[1]} {speed}")

print("M05 M02")
print("%")
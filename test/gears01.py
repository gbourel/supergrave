# Générateur d'engrenages en "LCode"

import math

# Précision
pr = 10

# Une seule dent
def dent(cx, cy, angle, Dpied, Dtete, pasAngulaire):
  x = int(cx + math.cos(angle) * (Dpied / 2) * pr)
  y = int(cy + math.sin(angle) * (Dpied / 2) * pr)
  print("MOVE", x, y)
  angle += pasAngulaire / 4
  x = int(cx + math.cos(angle) * (Dtete / 2) * pr)
  y = int(cy + math.sin(angle) * (Dtete / 2) * pr)
  print("MOVE", x, y)
  angle += pasAngulaire / 4
  x = int(cx + math.cos(angle) * (Dtete / 2) * pr)
  y = int(cy + math.sin(angle) * (Dtete / 2) * pr)
  print("MOVE", x, y)
  angle += pasAngulaire / 4
  x = int(cx + math.cos(angle) * (Dpied / 2) * pr)
  y = int(cy + math.sin(angle) * (Dpied / 2) * pr)
  print("MOVE", x, y)

# Une roue dentée
def roueDentee(cx, cy, dents, module):
  # Diamètre primitif
  Dp = module * dents
  # Pas
  p = math.pi * module
  # Pas angulaire (en radians)
  pa = (2 * math.pi) / dents
  # Saillie
  ha = module
  # Creux
  hf = 1.25 * module
  # Hauteur d'une dent
  h = 2*(ha + hf)
  # Diamètre de tête
  Dtete = Dp + 2*ha
  # Diamètre de pied
  Dpied = Dp - 2*hf

  print("LASER OFF")
  print("MOVE", int(cx + (Dpied / 2) * pr), cy)
  print("LASER ON")
  alpha = 0
  for i in range(dents):
    dent(cx, cy, alpha, Dpied, Dtete, pa)
    alpha += pa
  print("MOVE", int(cx + (Dpied / 2) * pr), cy)
  print("LASER OFF")

# Debut du programme

print("INIT")
print("LASER OFF")
print("MODE ABS")

roueDentee(500, 500, 16, 4)
roueDentee(1500, 800, 24, 4)

print("MOVE 0 0")

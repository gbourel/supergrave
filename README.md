# SuperGrave

Simulateur de graveur laser 2D.

Démo ici : <https://gbourel.frama.io/supergrave/>

## Versions

 * v0.4.0 : ajout des "exercices" qui permettent de valider un exercice prédéfini. Cf "Exercices". L'identifiant est a placer dans l'url avec comme clef `challenge`, par exemple `?challenge=basic_square`.
 * v0.3.1 : ajout du compteur de vues de la page
 * v0.3.0 : amplitude des coordonnées et paramètres de l'URL
   - erreur lors de l'utilisation de coordonnées en dehors des limites
   - permet l'utilisation de programmes avec des mouvements précis (très petite distance entre points)
   - paramètre de l'URL "program" pour définir le programme par défaut
   - paramètre de l'URL "autostart" pour lancer automatiquement le programme
 * v0.2.2 : corrections mineures
   - évite l'ajout de ligne inutiles lors du parse du programme
   - amélioration de l'affichage pour de programme volumineux
 * v0.2.1 : correction de bug de parse du programme lors d'un copié/collé avec Firefox
 * v0.2.0 : ajout de l'option haute précision
   - `HIPRE ON` active la haute précision coordonnées en centième de mm (max 305000 × 153000)
   - `HIPRE OFF` désactive la haute précision coordonnées en mm (max 3050 × 1530)
 * v0.1.0 : version initiale

### Exercices

 * `basic_square` : dessiner un simple carré de 400mm de coté, coin bas gauche en (200, 200).

## Développement

Page HTML statique.

Serveur avec live-reload

`npm install -g live-server`


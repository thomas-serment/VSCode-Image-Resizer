# VS Code Image Resizer 🍦

Utiliser VSCE Package car SHARP doit être compilé sur ordi


**VS Code Image Resizer** est une extension pour Visual Studio Code qui vous permet de redimensionner rapidement des images directement depuis l'éditeur de code.

## Fonctionnalités

- Redimensionnez facilement une ou plusieurs images à la fois
- Deux modes de redimensionnement :
  - Par pixels : définissez une taille fixe en pixels
  - Par pourcentage : réduisez proportionnellement vos images (1-100%)
- Sauvegarde automatique dans un dossier 'resized'
- Prend en charge de nombreux formats d'images : PNG, JPEG, JPG, WEBP, TIFF, HEIC
- Utilisable directement depuis l'explorateur de fichiers ou via des commandes

## Installation

⚠️ **Note importante** : En raison de la dépendance à la bibliothèque Sharp, l'extension doit être packagée localement pour assurer la compatibilité entre les systèmes d'exploitation.

Pour installer l'extension :
1. Clonez le repository
2. Installez les dépendances : `npm install`
3. Packagez l'extension localement : `vsce package`
4. Installez le fichier .vsix généré dans VS Code

## Utilisation

### Redimensionner des images

1. Sélectionnez une ou plusieurs images dans l'explorateur de fichiers
2. Faites un clic droit et choisissez "Bulk Resize Images"
3. Sélectionnez le mode de redimensionnement :
   - **Pixels** : entrez la taille souhaitée en pixels (ex: 800)
   - **Pourcentage** : entrez un pourcentage entre 1 et 100 (ex: 50)
4. Validez votre choix

Les images redimensionnées seront automatiquement sauvegardées dans un nouveau dossier 'resized' créé au même emplacement que les images originales.

### Localisation des images redimensionnées

- Un dossier 'resized' est créé automatiquement dans le même répertoire que les images source
- Les images redimensionnées conservent leur nom d'origine
- Structure :
  ```
  mon-dossier/
  ├── image.jpg
  └── resized/
      └── image.jpg
  ```

## Formats supportés

- PNG (.png)
- JPEG/JPG (.jpg, .jpeg)
- WEBP (.webp)
- TIFF (.tiff)
- HEIC (.heic)

## Notes de développement

Cette extension utilise la bibliothèque Sharp pour le traitement des images. En raison des différences de compilation entre les systèmes d'exploitation, il est recommandé de :

- Packager l'extension localement avec `vsce package`
- Ne pas utiliser les GitHub Actions pour le packaging
- Recompiler localement si nécessaire pour votre système d'exploitation

## Contribuer

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## Licence

MIT

const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

function activate(context) {
    let disposable = vscode.commands.registerCommand(
        "extension.bulkResizeImages",
        async (uri) => {
            // Demander à l'utilisateur s'il veut utiliser des pixels ou un pourcentage
            const resizeType = await vscode.window.showQuickPick(
                [
                    { label: "Pixels", value: "pixels" },
                    { label: "Pourcentage", value: "percentage" }
                ],
                {
                    placeHolder: "Choisissez le type de redimensionnement"
                }
            );

            if (!resizeType) return;

            // Adapter le message et la validation selon le type choisi
            const prompt = resizeType.value === "pixels"
                ? "Entrez la taille du côté le plus long (en pixels)"
                : "Entrez le pourcentage de redimensionnement (1-100)";

            const sizeInput = await vscode.window.showInputBox({
                prompt,
                placeHolder: resizeType.value === "pixels" ? "Ex. 800" : "Ex. 50",
                validateInput: (value) => {
                    if (!value.match(/^\d+$/)) {
                        return "La valeur doit être un nombre entier.";
                    }
                    if (resizeType.value === "percentage" && (parseInt(value) < 1 || parseInt(value) > 100)) {
                        return "Le pourcentage doit être entre 1 et 100.";
                    }
                    return null;
                },
            });

            if (!sizeInput) return;

            const size = parseInt(sizeInput);
            let filePaths = [];

            if (uri && uri.fsPath) {
                filePaths.push(uri.fsPath);
            } else {
                const result = await vscode.window.showOpenDialog({
                    canSelectFiles: true,
                    canSelectFolders: true,
                    canSelectMany: true,
                    openLabel: "Sélectionner",
                });

                if (!result || result.length === 0) {
                    vscode.window.showErrorMessage("Aucun fichier ou dossier sélectionné.");
                    return;
                }

                filePaths = result.map((file) => file.fsPath);
            }

            try {
                await Promise.all(
                    filePaths.map(async (filePath) => {
                        const stat = await fs.promises.stat(filePath);

                        if (stat.isFile()) {
                            await resizeImage(filePath, size, resizeType.value);
                        } else if (stat.isDirectory()) {
                            await processDirectory(filePath, size, resizeType.value);
                        }
                    })
                );
            } catch (error) {
                vscode.window.showErrorMessage(
                    `Une erreur s'est produite lors du redimensionnement des images : ${error}`
                );
            }
        }
    );

    context.subscriptions.push(disposable);
}

async function processDirectory(directoryPath, size, resizeType) {
    const files = await fs.promises.readdir(directoryPath);

    await Promise.all(
        files.map(async (fileName) => {
            const filePath = path.join(directoryPath, fileName);
            const stat = await fs.promises.stat(filePath);

            if (stat.isFile()) {
                await resizeImage(filePath, size, resizeType);
            } else if (stat.isDirectory()) {
                await processDirectory(filePath, size, resizeType);
            }
        })
    );
}

async function resizeImage(filePath, size, resizeType) {
    const extname = path.extname(filePath).toLowerCase();
    if (![
        ".png", ".jpg", ".jpeg", ".webp", ".tiff", ".heic",
        ".PNG", ".JPG", ".JPEG", ".WEBP", ".TIFF", ".HEIC"
    ].includes(extname)) {
        vscode.window.showWarningMessage(
            `Le fichier ${path.basename(filePath)} n'est pas une image valide (.png, .jpg, .jpeg). Il ne sera pas redimensionné.`
        );
        return;
    }

    try {
        const imageBuffer = await fs.promises.readFile(filePath);
        const imageMetadata = await sharp(imageBuffer).metadata();

        let newWidth, newHeight;
        if (resizeType === "percentage") {
            // Calculer les nouvelles dimensions basées sur le pourcentage
            newWidth = Math.round(imageMetadata.width * (size / 100));
            newHeight = Math.round(imageMetadata.height * (size / 100));
        } else {
            // Vérifier si la taille en pixels demandée est supérieure à la taille de l'image
            const maxSize = Math.max(imageMetadata.width, imageMetadata.height);
            if (size > maxSize) {
                vscode.window.showWarningMessage(
                    `La taille demandée est supérieure à la taille maximale de l'image. L'image ne sera pas redimensionnée.`
                );
                return;
            }
            newWidth = size;
            newHeight = size;
        }

        const resizedImageBuffer = await sharp(imageBuffer)
            .resize({
                width: newWidth,
                height: newHeight,
                fit: "inside",
            })
            .toBuffer();

        // Créer le dossier 'resized' s'il n'existe pas
        const resizedDir = path.join(path.dirname(filePath), 'resized');
        await fs.promises.mkdir(resizedDir, { recursive: true });

        // Utiliser le même nom de fichier dans le nouveau dossier
        const outputPath = path.join(resizedDir, path.basename(filePath));

        await fs.promises.writeFile(outputPath, resizedImageBuffer);

        vscode.window.showInformationMessage(
            `L'image ${path.basename(filePath)} a été redimensionnée et enregistrée dans le dossier 'resized'`
        );
    } catch (error) {
        vscode.window.showErrorMessage(
            `Une erreur s'est produite lors du redimensionnement de l'image ${path.basename(filePath)} : ${error}`
        );
    }
}

function deactivate() { }

module.exports = {
    activate,
    deactivate,
};
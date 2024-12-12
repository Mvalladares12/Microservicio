const express = require("express");
const cors = require("cors");
const { Storage } = require("@google-cloud/storage");
const multer = require("multer");
const path = require("path");
const crypto = require("node:crypto");
 
const app = express();

// process.env['GOOGLE_APPLICATION_CREDENTIALS']='./service_account.json';
 
const storage = new Storage();
 
const bucketName = process.env['BUCKET_ID'];
const bucketPath = process.env['BUCKET_PATH'];
 
// const bucketName='mvalladares-bootcamp';
// const bucketPath='imagenes';

const upload = multer({ storage: multer.memoryStorage()});
 
 
// Peticion para subir imagen
app.post("/upload", upload.single("file"), (req,res)=>{
    try {
        if(!req.file) return res.status(400).json({error: "not file path in the request"});
 
        const generateUniqueId = () => crypto.randomBytes(20).toString("hex");
 
        const fileExtension = path.extname(req.file.originalname);
        const uniqueFileName = `${generateUniqueId()}${fileExtension}`;
        const destinationBlobName = `${bucketPath}/${uniqueFileName}`
 
        const bucket = storage.bucket(bucketName);
        const blob = bucket.file(destinationBlobName)
 
        const stream = blob.createWriteStream({
            resumable: false,
            contentType: req.file.mimetype,
        })
 
        stream.on("error", (err)=>{
            res.status(500).json({error: "Error al subir la imagen"})
        })
 
        stream.on("finish",()=>{
            res.status(200).json({
                message: "Imagen subida correctamente",
                id: uniqueFileName,
            })
        })
 
        stream.end(req.file.buffer);
    } catch (error) {
        res.status(500).json({error: "Error interno del servidor"})   
    }
})
 
app.get("/file/:id",async (req, res)=>{
    try {
        const fileId = req.params.id;
        const destinationBlobName = `${bucketPath}/${fileId}`;
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(destinationBlobName);
 
        const [exists] = await file.exists();
        if(!exists) return res.status(400).json({error: "Archivo no encontrado"});
 
        const [metadata] = await file.getMetadata();
        const contentType = metadata.contentType || "application/octet-stream";
 
        res.setHeader("Content-Type", contentType);
 
        const stream = file.createReadStream();
        stream.pipe(res);
 
        stream.on("error", (err)=>{
            res.status(500).json({error: "Error al obtener la imagen"})
        })
 
        stream.on("end",()=>{
            console.log("leido exitosamente");
        })
 
    } catch (error) {
        res.status(500).json({error: "Error interno del servidor"})
    }
})
 
 
const PORT = process.env.PORT || 8080
 
app.listen(PORT,()=>{
    console.log("Escuchando en el puerto 8080")
})
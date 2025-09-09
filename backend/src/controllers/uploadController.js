import { v2 as cloud } from 'cloudinary';

const cloudReady = !!process.env.CLOUDINARY_URL;

export async function uploadImage(req, res, next){
  try{
    if(!req.file) return res.status(400).json({ message:'Envie um arquivo (campo: image)' });
    if(!cloudReady) return res.status(500).json({ message:'Cloudinary não configurado no servidor' });

    const b64 = req.file.buffer.toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloud.uploader.upload(dataURI, { folder: 'cupcakes' });
    res.status(201).json({ url: result.secure_url });
  }catch(e){ next(e); }
}

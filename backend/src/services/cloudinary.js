import { v2 as cloud } from 'cloudinary';

let configured = false;
try{
  if(process.env.CLOUDINARY_URL){
    cloud.config({ secure: true });
    configured = true;
  }
}catch{ configured = false; }

export function isCloudinaryReady(){ return configured; }

export async function uploadBufferToCloudinary(buffer, folder='cupcakes', filename='image'){
  if(!configured) throw new Error('Cloudinary não configurado');
  return await cloud.uploader.upload_stream({ folder, public_id: filename, resource_type:'image' });
}

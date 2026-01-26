import multer from "multer";

const storage = multer.memoryStorage()
export const uploadMemory = multer({ storage: storage });

//syntax của multer lưu file lên bộ nhớ tạm (memory)
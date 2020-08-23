const multer  = require('multer');
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        console.log(file);
        let fileName = Date.now() + path.extname(file.originalname);
        req.fileName = fileName;
        req.filePath = __dirname + "/public/images/" + fileName;
        cb(null, fileName);
    }
});
const fileFilter = (req, file, cb) => {
    if (file.mimetype == 'image/jpeg' || file.mimetype == 'image/png' || file.mimetype == 'image/jpg') {
        cb(null, true);
    } else {
        req.message = 'Please provide an image in JPG format.'
        cb(null, false);
    }
}
const upload = multer({ storage: storage, fileFilter: fileFilter });
module.exports = {
    upload : upload
}